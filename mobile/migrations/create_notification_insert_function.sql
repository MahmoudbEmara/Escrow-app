-- ============================================
-- Create RPC function to insert notifications
-- This bypasses RLS by using SECURITY DEFINER
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS insert_notification_for_transaction_participant(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_data JSONB,
  p_transaction_id UUID,
  p_current_user_id UUID
);

-- Create function to insert notification
-- This function verifies that both users are involved in the transaction
-- and then inserts the notification, bypassing RLS
CREATE OR REPLACE FUNCTION insert_notification_for_transaction_participant(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_data JSONB,
  p_transaction_id UUID,
  p_current_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_notification JSONB;
BEGIN
  -- Set search path explicitly to ensure public.transactions is found
  SET search_path = public, pg_temp;

  -- Verify both users are involved in the transaction
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id
    AND (
      (buyer_id = p_current_user_id AND seller_id = p_user_id)
      OR
      (seller_id = p_current_user_id AND buyer_id = p_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Users are not both involved in this transaction';
  END IF;

  -- Insert the notification and return it as JSONB
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data,
    read,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_data,
    false,
    NOW()
  ) RETURNING to_jsonb(notifications.*) INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_notification_for_transaction_participant(
  UUID, TEXT, TEXT, TEXT, JSONB, UUID, UUID
) TO authenticated;

