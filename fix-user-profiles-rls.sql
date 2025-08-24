-- Fix RLS policies for user_profiles table
-- Run this in Supabase SQL Editor

-- First, let's see current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles;

-- Create proper policies for user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Also allow upsert operations
CREATE POLICY "Users can upsert their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Test if we can now create a user profile
-- This should work for the authenticated user
INSERT INTO user_profiles (id, display_name) 
SELECT auth.uid(), 'Test User' 
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  updated_at = NOW();