DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    RAISE NOTICE 'profiles table is already in supabase_realtime publication';
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE 'Added profiles table to supabase_realtime publication';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding profiles to realtime publication: %', SQLERRM;
END $$;

