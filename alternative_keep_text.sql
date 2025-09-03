-- Alternative: Keep messages table as TEXT and use casting in views
-- This preserves all existing data but requires casting in joins

-- Since your messages table has test data with non-UUID values,
-- we can work around this by using explicit casting in the schema

-- Run the original journaling-system-schema.sql but first create these fixed views:

-- Fixed View 1: Recent journal entries with casting
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
LEFT JOIN profiles up ON je.user_id = up.user_id  -- journal_entries.user_id should be UUID
ORDER BY je.created_at DESC;

-- Fixed View 2: Active users with casting  
CREATE OR REPLACE VIEW active_users_24h AS
SELECT DISTINCT
  m.user_id::uuid as user_id,  -- Cast TEXT to UUID for consistency
  up.display_name,
  NULL as avatar_url,
  udt.device_token,
  COALESCE(unp.daily_checkin_enabled, true) as daily_checkin_enabled,
  COALESCE(unp.daily_checkin_time, '18:00:00'::time) as daily_checkin_time,
  COALESCE(unp.timezone, 'UTC'::text) as timezone
FROM messages m
LEFT JOIN profiles up ON m.user_id::uuid = up.user_id  -- Cast messages.user_id to UUID
LEFT JOIN user_device_tokens udt ON m.user_id::uuid = udt.user_id AND udt.is_active = TRUE
LEFT JOIN user_notification_preferences unp ON m.user_id::uuid = unp.user_id
WHERE m.created_at >= NOW() - INTERVAL '24 hours'
  AND m.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'  -- Only valid UUIDs
  AND (unp.daily_checkin_enabled IS NULL OR unp.daily_checkin_enabled = TRUE);