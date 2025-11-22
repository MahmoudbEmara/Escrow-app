-- Migration: Add RLS policies for profiles and wallets tables
-- Run this migration in your Supabase SQL editor

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on wallets table (if not already enabled)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;

-- Profiles: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Profiles: Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Profiles: Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Profiles: Allow users to search profiles by email/username (for transaction creation)
-- This allows users to find other users when creating transactions
CREATE POLICY "Users can search profiles for transactions"
ON profiles
FOR SELECT
TO authenticated
USING (true); -- Allow all authenticated users to search profiles

-- Wallets: Allow users to insert their own wallet
CREATE POLICY "Users can insert their own wallet"
ON wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Wallets: Allow users to view their own wallet
CREATE POLICY "Users can view their own wallet"
ON wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Wallets: Allow users to update their own wallet
CREATE POLICY "Users can update their own wallet"
ON wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

