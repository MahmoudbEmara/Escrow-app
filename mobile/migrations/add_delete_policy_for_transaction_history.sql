-- ============================================
-- Add DELETE policy for transaction_history
-- This allows users to delete their own transaction history records
-- ============================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete their own transaction history" ON public.transaction_history;

-- Add DELETE policy for transaction_history
CREATE POLICY "Users can delete their own transaction history"
  ON public.transaction_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

