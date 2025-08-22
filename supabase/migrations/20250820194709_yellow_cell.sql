/*
  # Simplify RLS - Remove all recursive policies

  This migration removes all complex RLS policies that cause infinite recursion
  and implements the most basic security model:
  
  1. Users can only read/write their own profile
  2. Users can only read/write their own time entries
  3. No admin-specific policies (admins will use service role for management)
  
  This eliminates any possibility of infinite recursion while maintaining
  basic data isolation between users.
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Enable admin read access on profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;

-- Drop all existing policies on time_entries table
DROP POLICY IF EXISTS "Enable admin read access on time_entries" ON time_entries;
DROP POLICY IF EXISTS "Enable insert for own entries" ON time_entries;
DROP POLICY IF EXISTS "Enable read access for own entries" ON time_entries;

-- Create simple policies for profiles table
-- Users can only see and modify their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create simple policies for time_entries table
-- Users can only see and modify their own time entries
CREATE POLICY "Users can read own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Note: Admins will use service role key to bypass RLS entirely
-- This eliminates any need for admin-specific policies that could cause recursion