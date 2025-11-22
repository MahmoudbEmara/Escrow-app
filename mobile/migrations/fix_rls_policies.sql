-- Fix RLS Policies for profiles and wallets
-- Run this in your Supabase SQL Editor

-- First, verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
    
    -- Drop all policies on wallets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'wallets' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON wallets';
    END LOOP;
END $$;

-- ==================== PROFILES POLICIES ====================

-- Allow authenticated users to INSERT their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to SELECT their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to UPDATE their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to search all profiles (for transaction creation)
CREATE POLICY "Users can search profiles for transactions"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- ==================== WALLETS POLICIES ====================

-- Allow authenticated users to INSERT their own wallet
CREATE POLICY "Users can insert their own wallet"
ON wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to SELECT their own wallet
CREATE POLICY "Users can view their own wallet"
ON wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to UPDATE their own wallet
CREATE POLICY "Users can update their own wallet"
ON wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('profiles', 'wallets')
AND schemaname = 'public'
ORDER BY tablename, policyname;

