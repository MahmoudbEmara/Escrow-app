-- ============================================
-- Add DELETE policy for transaction_history
-- This allows authenticated users to delete their own transaction history records
-- ============================================

-- Drop existing DELETE policy for transaction_history if it exists
DROP POLICY IF EXISTS "Users can delete their own transaction history" ON public.transaction_history;

-- Add DELETE policy for transaction_history
CREATE POLICY "Users can delete their own transaction history"
  ON public.transaction_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also allow deletion of transaction history for transactions the user is involved in
DROP POLICY IF EXISTS "Users can delete transaction history for their transactions" ON public.transaction_history;

CREATE POLICY "Users can delete transaction history for their transactions"
  ON public.transaction_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_history.transaction_id
      AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
    )
  );

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transaction_history'
AND schemaname = 'public'
ORDER BY policyname;

