-- ============================================
-- Create RPC function to insert transaction history
-- This bypasses RLS by using SECURITY DEFINER
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS insert_transaction_history_for_transaction_participant(
  p_user_id UUID,
  p_transaction_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_current_user_id UUID
);

-- Create function to insert transaction history
-- This function verifies that both users are involved in the transaction
-- and then inserts the history, bypassing RLS
CREATE OR REPLACE FUNCTION insert_transaction_history_for_transaction_participant(
  p_user_id UUID,
  p_transaction_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_current_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_history JSONB;
BEGIN
  -- Set search path explicitly to ensure public.transactions is found
  SET search_path = public, pg_temp;

  -- Verify both users are involved in the transaction
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id
    AND (
      (buyer_id = p_current_user_id AND seller_id = p_user_id)
      OR
      (seller_id = p_current_user_id AND buyer_id = p_user_id)
      OR
      (buyer_id = p_current_user_id AND buyer_id = p_user_id)
      OR
      (seller_id = p_current_user_id AND seller_id = p_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Users are not both involved in this transaction';
  END IF;

  -- Insert the transaction history and return it as JSONB
  INSERT INTO public.transaction_history (
    user_id,
    transaction_id,
    type,
    amount,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_transaction_id,
    p_type,
    p_amount,
    p_description,
    NOW()
  ) RETURNING to_jsonb(transaction_history.*) INTO v_history;

  RETURN v_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_transaction_history_for_transaction_participant(
  UUID, UUID, TEXT, NUMERIC, TEXT, UUID
) TO authenticated;

