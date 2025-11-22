-- Create a function to check username availability
-- This function uses SECURITY DEFINER to bypass RLS for username availability checks during signup
-- This is safe because it only returns whether the username exists, not sensitive data

CREATE OR REPLACE FUNCTION public.check_username_available(username_input TEXT)
RETURNS TABLE(available BOOLEAN, username_exists BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_check BOOLEAN;
BEGIN
  -- Check if username exists (case-insensitive)
  SELECT EXISTS(
    SELECT 1 
    FROM profiles 
    WHERE LOWER(username) = LOWER(username_input)
  ) INTO exists_check;
  
  -- Return available = NOT exists
  RETURN QUERY SELECT NOT exists_check, exists_check;
END;
$$;

-- Grant execute permission to authenticated and anon users (for signup)
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon;

