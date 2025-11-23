-- ============================================
-- Add INSERT policies for transaction_history and notifications
-- This allows users to insert their own transaction history and receive notifications
-- ============================================

-- Drop existing INSERT policy for transaction_history if it exists
DROP POLICY IF EXISTS "Users can insert their own transaction history" ON public.transaction_history;

-- Add INSERT policy for transaction_history
CREATE POLICY "Users can insert their own transaction history"
  ON public.transaction_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop existing notification INSERT policy if it exists
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- Create a function to check if both users are involved in the same transaction
-- This function bypasses RLS to check transaction participation
CREATE OR REPLACE FUNCTION check_transaction_participants(
  p_transaction_id UUID,
  p_current_user_id UUID,
  p_notification_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  SET search_path = public, pg_temp;
  RETURN EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id
    AND (
      (buyer_id = p_current_user_id AND seller_id = p_notification_user_id)
      OR
      (seller_id = p_current_user_id AND buyer_id = p_notification_user_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_transaction_participants(UUID, UUID, UUID) TO authenticated;

-- Add INSERT policy for notifications
-- Allow users to create notifications for other users if they're involved in the same transaction
CREATE POLICY "Users can receive notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can insert notifications for themselves
    auth.uid() = user_id
    OR
    -- User can insert notifications for other users if they're involved in the same transaction
    (
      data->>'transaction_id' IS NOT NULL
      AND check_transaction_participants(
        (data->>'transaction_id')::uuid,
        auth.uid(),
        user_id
      )
    )
  );

-- Verify function was created
SELECT 
  proname as function_name,
  proargnames as argument_names,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'check_transaction_participants'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('transaction_history', 'notifications')
AND schemaname = 'public'
ORDER BY tablename, policyname;

