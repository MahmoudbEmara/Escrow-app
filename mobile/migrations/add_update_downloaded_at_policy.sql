DROP POLICY IF EXISTS "Users can update downloaded_at for messages they receive" ON messages;

CREATE POLICY "Users can update downloaded_at for messages they receive"
ON messages
FOR UPDATE
USING (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM transactions
    WHERE transactions.id = messages.transaction_id
    AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
  )
)
WITH CHECK (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM transactions
    WHERE transactions.id = messages.transaction_id
    AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
  )
);

