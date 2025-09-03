-- Alternative: Fix the journaling schema with type casts
-- Use this if you can't or don't want to change the profiles table

-- Find and replace the problematic JOIN lines in the journaling schema
-- This is a safer approach that doesn't modify existing table structure

-- The two problematic views that need fixing:

-- Fix 1: recent_journal_entries view
CREATE OR REPLACE VIEW recent_journal_entries AS
SELECT 
  je.id,
  je.user_id,
  je.created_at,
  je.prompt,
  LEFT(je.content, 200) as content_preview,
  je.word_count,
  up.display_name,
  NULL as avatar_url,
  ROW_NUMBER() OVER (PARTITION BY je.user_id ORDER BY je.created_at DESC) as entry_rank
FROM journal_entries je
LEFT JOIN profiles up ON je.user_id::text = up.user_id  -- Cast UUID to TEXT
ORDER BY je.created_at DESC;

-- Fix 2: active_users_24h view  
CREATE OR REPLACE VIEW active_users_24h AS
SELECT DISTINCT
  m.user_id,
  up.display_name,
  NULL as avatar_url,
  NULL as device_token,
  true as daily_checkin_enabled,
  '18:00:00'::time as daily_checkin_time,
  'UTC'::text as timezone
FROM messages m
LEFT JOIN profiles up ON m.user_id::text = up.user_id  -- Cast UUID to TEXT
LEFT JOIN user_device_tokens udt ON m.user_id = udt.user_id AND udt.is_active = TRUE
LEFT JOIN user_notification_preferences unp ON m.user_id = unp.user_id
WHERE m.created_at >= NOW() - INTERVAL '24 hours'
  AND (unp.daily_checkin_enabled IS NULL OR unp.daily_checkin_enabled = TRUE);