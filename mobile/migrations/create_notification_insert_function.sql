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
  v_transaction RECORD;
BEGIN
  -- Set search path explicitly to ensure public.transactions is found
  SET search_path = public, pg_temp;

  -- Verify both users are involved in the transaction
  SELECT buyer_id, seller_id INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % does not exist', p_transaction_id;
  END IF;
  
  IF NOT (
    (v_transaction.buyer_id = p_current_user_id AND v_transaction.seller_id = p_user_id)
    OR
    (v_transaction.seller_id = p_current_user_id AND v_transaction.buyer_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Users are not both involved in this transaction. Transaction: buyer=%, seller=%, Current user=%, Notification recipient=%', 
      v_transaction.buyer_id, v_transaction.seller_id, p_current_user_id, p_user_id;
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

