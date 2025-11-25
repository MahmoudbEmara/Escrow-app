ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

CREATE OR REPLACE FUNCTION update_user_online_status(
  p_user_id UUID,
  p_is_online BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_online = p_is_online,
    last_seen = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_last_seen(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_users_offline_after_inactivity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET is_online = FALSE
  WHERE is_online = TRUE
    AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$;

CREATE POLICY "Users can view online status of other users"
  ON public.profiles FOR SELECT
  USING (true);

GRANT EXECUTE ON FUNCTION update_user_online_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_seen(UUID) TO authenticated;

