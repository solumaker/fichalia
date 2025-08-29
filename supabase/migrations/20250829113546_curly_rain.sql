/*
  # Migrate profile image to profiles table

  1. Schema Changes
    - Add `profile_image_url` column to `profiles` table
    - Migrate existing data from `user_profiles_extended` table
    - Drop `user_profiles_extended` table

  2. Data Migration
    - Copy profile_image_url data from user_profiles_extended to profiles
    - Preserve existing profile data

  3. Security
    - Maintain existing RLS policies on profiles table
*/

-- Add profile_image_url column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Migrate existing data from user_profiles_extended to profiles
UPDATE profiles 
SET profile_image_url = upe.profile_image_url
FROM user_profiles_extended upe
WHERE profiles.id = upe.id
AND upe.profile_image_url IS NOT NULL;

-- Drop the user_profiles_extended table
DROP TABLE IF EXISTS user_profiles_extended CASCADE;