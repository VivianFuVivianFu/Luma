-- COMPREHENSIVE COMMUNITY DIAGNOSIS
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if the table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'community_categories';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'community_categories'
ORDER BY ordinal_position;

-- 3. Check if there are any categories
SELECT COUNT(*) as total_categories FROM community_categories;

-- 4. Check all categories (if any exist)
SELECT id, name, slug, description, color, icon, is_active, post_count, member_count, created_at
FROM community_categories 
ORDER BY created_at;

-- 5. Check RLS (Row Level Security) policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'community_categories';

-- 6. Try to insert test data (will fail if RLS blocks it)
INSERT INTO community_categories (name, slug, description, color, icon) VALUES
('TEST_CATEGORY', 'test-category', 'This is a test', '#ff0000', 'users')
ON CONFLICT (name) DO NOTHING;

-- 7. Check if test data was inserted
SELECT name FROM community_categories WHERE slug = 'test-category';

-- 8. Clean up test data
DELETE FROM community_categories WHERE slug = 'test-category';

-- 9. If no categories exist, insert the real ones
INSERT INTO community_categories (name, slug, description, color, icon) VALUES
('Introduce Your Self', 'introduce-your-self', 'Welcome! Share a bit about yourself, your wellness journey, and what brings you to our community', '#22c55e', 'users'),
('Mental Wellness', 'mental-wellness', 'Share your journey, challenges, and victories in mental health and emotional wellbeing', '#6366f1', 'heart'),
('Self-Reflection', 'self-reflection', 'Deep thoughts, personal insights, and growth experiences from your wellness journey', '#8b5cf6', 'users'),
('Daily Practices', 'daily-practices', 'Routines, habits, and practices that support your wellbeing and mental health', '#06b6d4', 'calendar'),
('Support & Encouragement', 'support-encouragement', 'A safe space to seek and offer support to fellow community members', '#10b981', 'users'),
('Success Stories', 'success-stories', 'Celebrate breakthroughs, achievements, and positive transformations', '#f59e0b', 'star'),
('Resources & Tips', 'resources-tips', 'Helpful tools, articles, techniques, and recommendations for mental wellness', '#ef4444', 'bookmark')
ON CONFLICT (name) DO NOTHING;

-- 10. Final verification
SELECT name, slug, is_active, created_at 
FROM community_categories 
ORDER BY created_at;