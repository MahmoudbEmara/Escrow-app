-- ============================================
-- Fix incorrectly set read_at values
-- This migration resets read_at for messages where senders incorrectly marked their own messages as read
-- ============================================

-- The issue: Some messages have read_at set even though they were sent by the current user
-- This happened before we fixed the RLS policy. We need to identify and reset these.
-- 
-- Strategy: We can't directly know WHO set read_at, but we can identify suspicious patterns:
-- 1. Messages where read_at is set but shouldn't be (we'll be conservative)
-- 2. Actually, the safest approach is to reset ALL read_at values and let them be re-marked correctly
--    when users view chats. This ensures data integrity.

-- First, let's see what we're dealing with
DO $$
DECLARE
  total_with_read_at INTEGER;
  affected_transactions INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT transaction_id)
  INTO total_with_read_at, affected_transactions
  FROM public.messages
  WHERE read_at IS NOT NULL;
  
  RAISE NOTICE 'Total messages with read_at: %', total_with_read_at;
  RAISE NOTICE 'Affected transactions: %', affected_transactions;
END $$;

-- Reset ALL read_at values to NULL
-- This is safe because:
-- 1. The RLS policy now prevents senders from marking their own messages as read
-- 2. When users open chats, messages will be correctly marked as read by receivers only
-- 3. This ensures data integrity going forward
UPDATE public.messages
SET read_at = NULL
WHERE read_at IS NOT NULL;

-- Verify the reset
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_count
  FROM public.messages
  WHERE read_at IS NOT NULL;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Successfully reset all read_at values. All messages are now unread.';
    RAISE NOTICE '   Users will need to open chats to re-mark messages as read (correctly).';
  ELSE
    RAISE WARNING '⚠️  Some read_at values remain: %', remaining_count;
  END IF;
END $$;

