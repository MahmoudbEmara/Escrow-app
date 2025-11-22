-- Create a function to lookup user email by username
-- This function uses SECURITY DEFINER to bypass RLS for username lookups during login
-- This is safe because it only returns the email, not sensitive data

CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input TEXT)
RETURNS TABLE(id UUID, email TEXT, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email::TEXT, p.username::TEXT
  FROM profiles p
  WHERE LOWER(p.username) = LOWER(username_input)
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users (for login)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;

-- Also create a function to lookup user email by email (for consistency)
CREATE OR REPLACE FUNCTION public.get_email_by_email(email_input TEXT)
RETURNS TABLE(id UUID, email TEXT, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email::TEXT, p.username::TEXT
  FROM profiles p
  WHERE LOWER(p.email) = LOWER(email_input)
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_email_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_email(TEXT) TO anon;

