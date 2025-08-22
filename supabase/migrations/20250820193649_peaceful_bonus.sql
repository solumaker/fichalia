/*
  # Fix RLS infinite recursion in profiles table

  1. Problem
    - Current policies create infinite recursion when querying profiles table
    - The "Admins can view all entries" policy in time_entries references profiles table
    - This creates circular dependency when accessing profiles

  2. Solution
    - Simplify profiles policies to use only auth.uid() without subqueries
    - Remove complex admin policies that reference profiles table
    - Keep authentication simple and direct

  3. Changes
    - Drop all existing policies on profiles table
    - Create simple, non-recursive policies
    - Update time_entries policies to avoid profiles table references
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop problematic policies on time_entries that reference profiles
DROP POLICY IF EXISTS "Admins can view all entries" ON time_entries;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple policies for time_entries without referencing profiles
CREATE POLICY "Users can view own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());