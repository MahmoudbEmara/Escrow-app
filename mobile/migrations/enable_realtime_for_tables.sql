-- ============================================
-- Enable Realtime for tables
-- This migration adds tables to the supabase_realtime publication
-- Required for Postgres Changes subscriptions to work
-- Reference: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
-- ============================================

-- First, ensure the supabase_realtime publication exists
-- If it doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to the publication for realtime subscriptions
-- Remove tables first if they're already in the publication (to avoid errors)
-- Note: DROP TABLE doesn't support IF EXISTS, so we use DO block to handle errors gracefully
DO $$
BEGIN
  -- Try to remove tables if they exist (ignore errors if they don't)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE transactions;
  EXCEPTION WHEN OTHERS THEN
    -- Table not in publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE messages;
  EXCEPTION WHEN OTHERS THEN
    -- Table not in publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE wallets;
  EXCEPTION WHEN OTHERS THEN
    -- Table not in publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE transaction_history;
  EXCEPTION WHEN OTHERS THEN
    -- Table not in publication, ignore
  END;
END $$;

-- Add tables to the publication (will error if already added, but that's okay)
-- We'll use DO block to handle gracefully
DO $$
BEGIN
  -- Add tables if they're not already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transaction_history;
  END IF;
END $$;

-- Verify tables are in the publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

