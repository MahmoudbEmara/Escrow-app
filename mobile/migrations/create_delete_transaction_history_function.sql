-- ============================================
-- Create RPC function to delete transaction history
-- This bypasses RLS by using SECURITY DEFINER
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_transaction_history_for_transaction(
  p_transaction_id UUID,
  p_user_id UUID
);

-- Create function to delete transaction history
-- This function verifies the user is involved in the transaction
-- and then deletes all history records, bypassing RLS
CREATE OR REPLACE FUNCTION delete_transaction_history_for_transaction(
  p_transaction_id UUID,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Set search path explicitly
  SET search_path = public, pg_temp;

  -- Verify user is involved in the transaction
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id
    AND (buyer_id = p_user_id OR seller_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'User is not involved in this transaction';
  END IF;

  -- Delete all transaction history records for this transaction
  DELETE FROM public.transaction_history
  WHERE transaction_id = p_transaction_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_transaction_history_for_transaction(
  UUID, UUID
) TO authenticated;

