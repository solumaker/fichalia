/*
  # Fix infinite recursion in RLS policies

  1. Security Changes
    - Drop all existing policies that cause recursion
    - Create simple policies that don't reference other tables
    - Use auth.uid() directly without complex joins

  2. New Policies
    - Users can read/update their own profile
    - Users can read/insert their own time entries
    - Simple admin check using auth.jwt()
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can view their own entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all entries" ON time_entries;

-- Simple policies for profiles table
CREATE POLICY "Enable read access for own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Simple policies for time_entries table
CREATE POLICY "Enable read access for own entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin access using JWT claims (no table lookups)
CREATE POLICY "Enable admin read access on profiles" ON profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Enable admin read access on time_entries" ON time_entries
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );