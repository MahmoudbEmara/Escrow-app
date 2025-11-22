-- Migration: Add username, first_name, last_name to profiles table
-- Run this migration in your Supabase SQL editor

-- Add username, first_name, last_name columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add constraint to ensure username format (only if constraint doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'username_format_check'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT username_format_check 
    CHECK (username IS NULL OR (username ~ '^[a-z0-9_]+$' AND length(username) >= 3 AND length(username) <= 30));
  END IF;
END $$;

-- Update existing records: try to split name into first_name and last_name
-- This is a best-effort update for existing users
UPDATE profiles 
SET first_name = CASE 
  WHEN name IS NOT NULL AND position(' ' in name) > 0 
  THEN substring(name from 1 for position(' ' in name) - 1)
  ELSE name
END,
last_name = CASE 
  WHEN name IS NOT NULL AND position(' ' in name) > 0 
  THEN substring(name from position(' ' in name) + 1)
  ELSE NULL
END
WHERE first_name IS NULL AND name IS NOT NULL;

-- Add comment to document the migration
COMMENT ON COLUMN profiles.username IS 'Unique username for user identification (3-30 chars, lowercase alphanumeric and underscores only)';
COMMENT ON COLUMN profiles.first_name IS 'User first name';
COMMENT ON COLUMN profiles.last_name IS 'User last name';

