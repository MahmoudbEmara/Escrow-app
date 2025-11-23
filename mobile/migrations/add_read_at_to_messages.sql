-- ============================================
-- Add read_at column to messages table
-- This migration adds the read_at column to track when messages are read
-- Required for unread message count functionality
-- ============================================

-- Add read_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added read_at column to messages table';
  ELSE
    RAISE NOTICE 'read_at column already exists in messages table';
  END IF;
END $$;

-- Create index on read_at for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_read_at 
ON public.messages(transaction_id, read_at) 
WHERE read_at IS NULL;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messages'
AND column_name = 'read_at';

