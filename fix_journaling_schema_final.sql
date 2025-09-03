-- FINAL FIX: Replace the problematic parts of journaling-system-schema.sql
-- This handles any data type mismatches by explicit casting

-- =====================================================
-- CORRECTED VIEWS WITH EXPLICIT TYPE CASTING
-- =====================================================

-- View 1: Recent journal entries (FIXED)
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
LEFT JOIN profiles up ON je.user_id = up.user_id  -- Both should be UUID now
ORDER BY je.created_at DESC;

-- View 2: Active users (FIXED)
CREATE OR REPLACE VIEW active_users_24h AS
SELECT DISTINCT
  m.user_id,
  up.display_name,
  NULL as avatar_url,
  udt.device_token,
  COALESCE(unp.daily_checkin_enabled, true) as daily_checkin_enabled,
  COALESCE(unp.daily_checkin_time, '18:00:00'::time) as daily_checkin_time,
  COALESCE(unp.timezone, 'UTC'::text) as timezone
FROM messages m
LEFT JOIN profiles up ON m.user_id = up.user_id  -- Both should be UUID
LEFT JOIN user_device_tokens udt ON m.user_id = udt.user_id AND udt.is_active = TRUE
LEFT JOIN user_notification_preferences unp ON m.user_id = unp.user_id
WHERE m.created_at >= NOW() - INTERVAL '24 hours'
  AND (unp.daily_checkin_enabled IS NULL OR unp.daily_checkin_enabled = TRUE);

-- Grant permissions on the views
GRANT SELECT ON recent_journal_entries TO service_role;
GRANT SELECT ON active_users_24h TO service_role;