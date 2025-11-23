-- ============================================
-- Add RLS policy to allow users to update read_at for messages in their transactions
-- This policy allows users to mark messages as read even if they didn't send them
-- ============================================

-- Drop ALL existing UPDATE policies on messages table to start fresh
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read in their transactions" ON public.messages;

-- List any other UPDATE policies that might exist
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Note: We're not creating a policy for users to update their own messages
-- This prevents senders from updating read_at on their own messages
-- If you need users to edit their own message content in the future, you can add a policy
-- that explicitly excludes read_at updates

-- Create a new policy that allows users to update read_at for messages in their transactions
-- This allows marking messages as read, but ONLY by the receiver (not the sender)
-- CRITICAL: The USING clause checks the existing row (OLD), WITH CHECK checks the new row (NEW)
CREATE POLICY "Users can mark messages as read in their transactions"
  ON public.messages FOR UPDATE
  USING (
    -- User can update if they're involved in the transaction
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = messages.transaction_id
      AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
    )
    -- CRITICAL: The user is NOT the sender (only receiver can mark as read)
    -- This checks the existing row's sender_id
    AND messages.sender_id != auth.uid()
  )
  WITH CHECK (
    -- Same checks for WITH CHECK clause (checks the new row)
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = messages.transaction_id
      AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
    )
    -- CRITICAL: The user is NOT the sender (only receiver can mark as read)
    -- This checks the new row's sender_id (which shouldn't change, but we verify)
    AND messages.sender_id != auth.uid()
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'messages'
ORDER BY policyname;

