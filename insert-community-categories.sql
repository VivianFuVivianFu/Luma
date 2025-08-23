-- Insert default community categories
-- Run this in Supabase SQL Editor after the schema has been created

INSERT INTO community_categories (name, slug, description, color, icon) VALUES
('Introduce Your Self', 'introduce-your-self', 'Welcome! Share a bit about yourself, your wellness journey, and what brings you to our community', '#22c55e', 'users'),
('Mental Wellness', 'mental-wellness', 'Share your journey, challenges, and victories in mental health and emotional wellbeing', '#6366f1', 'heart'),
('Self-Reflection', 'self-reflection', 'Deep thoughts, personal insights, and growth experiences from your wellness journey', '#8b5cf6', 'users'),
('Daily Practices', 'daily-practices', 'Routines, habits, and practices that support your wellbeing and mental health', '#06b6d4', 'calendar'),
('Support & Encouragement', 'support-encouragement', 'A safe space to seek and offer support to fellow community members', '#10b981', 'users'),
('Success Stories', 'success-stories', 'Celebrate breakthroughs, achievements, and positive transformations', '#f59e0b', 'star'),
('Resources & Tips', 'resources-tips', 'Helpful tools, articles, techniques, and recommendations for mental wellness', '#ef4444', 'bookmark')
ON CONFLICT (name) DO NOTHING;

-- Verify the categories were inserted
SELECT name, slug, description, color, icon, post_count, member_count
FROM community_categories
ORDER BY name;
