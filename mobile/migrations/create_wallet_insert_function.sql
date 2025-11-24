-- ============================================
-- Create RPC function to insert wallets
-- This bypasses RLS by using SECURITY DEFINER
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS insert_wallet_for_user(
  p_user_id UUID,
  p_initial_balance NUMERIC
);

-- Create function to insert wallet
-- This function allows creating wallets for any user
-- (useful when completing transactions for users who don't have wallets yet)
CREATE OR REPLACE FUNCTION insert_wallet_for_user(
  p_user_id UUID,
  p_initial_balance NUMERIC DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_wallet JSONB;
BEGIN
  -- Set search path explicitly
  SET search_path = public, pg_temp;

  -- Check if wallet already exists
  IF EXISTS (
    SELECT 1 FROM public.wallets
    WHERE user_id = p_user_id
  ) THEN
    -- Return existing wallet
    SELECT to_jsonb(wallets.*) INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id;
    
    RETURN v_wallet;
  END IF;

  -- Insert the wallet and return it as JSONB
  INSERT INTO public.wallets (
    user_id,
    balance,
    created_at
  ) VALUES (
    p_user_id,
    p_initial_balance,
    NOW()
  ) RETURNING to_jsonb(wallets.*) INTO v_wallet;

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_wallet_for_user(
  UUID, NUMERIC
) TO authenticated;

