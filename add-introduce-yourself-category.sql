-- Add "Introduce Your Self" category to the community
-- Run this in Supabase SQL Editor

INSERT INTO community_categories (name, slug, description, color, icon) VALUES
('Introduce Your Self', 'introduce-your-self', 'Welcome! Share a bit about yourself, your wellness journey, and what brings you to our community', '#22c55e', 'users')
ON CONFLICT (name) DO NOTHING;

-- Verify the new category was added
SELECT name, slug, description, color, icon, post_count, member_count, created_at 
FROM community_categories 
WHERE slug = 'introduce-your-self';

-- Show all categories including the new one
SELECT name, slug, description, color, icon, post_count, member_count 
FROM community_categories 
ORDER BY created_at ASC;