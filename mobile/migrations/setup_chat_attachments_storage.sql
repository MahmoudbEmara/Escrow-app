INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload attachments to their transactions" ON storage.objects;
CREATE POLICY "Users can upload attachments to their transactions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM transactions
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view attachments in their transactions" ON storage.objects;
CREATE POLICY "Users can view attachments in their transactions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM transactions
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM transactions
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

