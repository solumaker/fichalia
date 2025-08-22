/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current RLS policies on profiles table are causing infinite recursion
    - Policies are trying to query profiles table from within profiles table policies
    - This creates a circular dependency when checking user roles

  2. Solution
    - Drop existing problematic policies
    - Create simpler, non-recursive policies
    - Users can read their own profile using auth.uid() = id
    - For admin functionality, we'll handle role checking in the application layer
    - Keep policies simple to avoid recursion

  3. Security
    - Users can only read and update their own profile
    - Insert operations will be handled by the trigger function
    - Admin operations will be handled at application level with proper checks
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow inserts for the trigger function (this will be used when new users sign up)
CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);