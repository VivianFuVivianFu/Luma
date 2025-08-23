-- Make vivianfu2026@gmail.com a moderator
-- Run this in Supabase SQL Editor

-- First, ensure user profile exists for vivianfu2026@gmail.com
INSERT INTO user_profiles (id, display_name, join_date)
SELECT 
  id, 
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name', 
    email
  ) as display_name,
  created_at as join_date
FROM auth.users
WHERE email = 'vivianfu2026@gmail.com'
  AND id NOT IN (SELECT id FROM user_profiles);

-- Make vivianfu2026@gmail.com a moderator
UPDATE user_profiles 
SET is_moderator = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'vivianfu2026@gmail.com'
);

-- Verify the moderator was set
SELECT 
  u.email,
  up.display_name,
  up.is_moderator,
  up.created_at
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'vivianfu2026@gmail.com';