-- Add RLS policy to allow users to delete their own transactions
-- Run this in your Supabase SQL Editor

-- Enable RLS on transactions table (if not already enabled)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Create DELETE policy: Users can delete transactions where they are the buyer or seller
CREATE POLICY "Users can delete their own transactions"
ON transactions
FOR DELETE
TO authenticated
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
);

-- Verify the policy was created
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'transactions'
AND schemaname = 'public'
AND cmd = 'DELETE';

