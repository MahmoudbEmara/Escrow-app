-- ============================================
-- Add trigger to prevent senders from updating read_at on their own messages
-- This is an additional safeguard beyond RLS policies
-- ============================================

-- Create a function that prevents senders from updating read_at on their own messages
CREATE OR REPLACE FUNCTION prevent_sender_read_at_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If read_at is being updated and the current user is the sender, prevent it
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    -- Check if the current user is the sender
    IF NEW.sender_id = auth.uid() THEN
      RAISE EXCEPTION 'Senders cannot mark their own messages as read. Only receivers can update read_at.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS prevent_sender_read_at_update_trigger ON public.messages;

-- Create the trigger
CREATE TRIGGER prevent_sender_read_at_update_trigger
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  WHEN (NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read_at IS DISTINCT FROM NEW.read_at))
  EXECUTE FUNCTION prevent_sender_read_at_update();

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'messages'
AND trigger_name = 'prevent_sender_read_at_update_trigger';

