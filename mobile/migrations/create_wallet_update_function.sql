-- ============================================
-- Create RPC function to update wallet balance
-- This bypasses RLS by using SECURITY DEFINER
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_wallet_balance_for_user(
  p_user_id UUID,
  p_amount NUMERIC
);

-- Create function to update wallet balance
-- This function allows updating wallets for any user
-- (useful when completing transactions and releasing funds)
CREATE OR REPLACE FUNCTION update_wallet_balance_for_user(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_wallet JSONB;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Set search path explicitly
  SET search_path = public, pg_temp;

  -- Get current balance or create wallet if it doesn't exist
  SELECT balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist, create it
  IF v_current_balance IS NULL THEN
    INSERT INTO public.wallets (
      user_id,
      balance,
      created_at
    ) VALUES (
      p_user_id,
      0,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get the balance again (should be 0 now)
    SELECT balance INTO v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id;
  END IF;

  -- Calculate new balance
  v_new_balance = COALESCE(v_current_balance, 0) + p_amount;

  -- Check for insufficient balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_balance, p_amount;
  END IF;

  -- Update the wallet
  UPDATE public.wallets
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING to_jsonb(wallets.*) INTO v_wallet;

  -- If update didn't return a row, something went wrong
  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Failed to update wallet for user %', p_user_id;
  END IF;

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_wallet_balance_for_user(
  UUID, NUMERIC
) TO authenticated;

