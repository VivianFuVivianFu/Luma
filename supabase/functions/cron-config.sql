-- =====================================================
-- CRON JOB CONFIGURATION FOR SUPABASE
-- Set up scheduled jobs for daily check-ins
-- =====================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check-in generator to run at 6 PM every day
-- This calls the Edge Function via HTTP request
SELECT cron.schedule(
  'daily-checkin-6pm', 
  '0 18 * * *', -- 6 PM every day
  $$
  SELECT net.http_post(
    url := 'https://oyqzljunafjfuwdedjee.supabase.co/functions/v1/daily-checkin-generator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{"source": "cron_job", "timestamp": "' || NOW() || '"}'
  ) as request_id;
  $$
);

-- Optional: Schedule cleanup of old notification logs (run weekly)
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 * * 0', -- 2 AM every Sunday
  $$
  DELETE FROM notifications_log 
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND delivery_status IN ('sent', 'delivered');
  $$
);

-- Optional: Schedule user engagement analytics (run daily at midnight)
SELECT cron.schedule(
  'daily-engagement-stats',
  '0 0 * * *', -- Midnight every day
  $$
  INSERT INTO user_engagement_daily (
    date,
    total_active_users,
    total_journal_entries,
    total_notifications_sent
  )
  SELECT 
    CURRENT_DATE,
    COUNT(DISTINCT m.user_id),
    (SELECT COUNT(*) FROM journal_entries WHERE created_at::date = CURRENT_DATE - 1),
    (SELECT COUNT(*) FROM notifications_log WHERE sent_at::date = CURRENT_DATE - 1)
  FROM messages m
  WHERE m.created_at::date = CURRENT_DATE - 1
  ON CONFLICT (date) DO UPDATE SET
    total_active_users = EXCLUDED.total_active_users,
    total_journal_entries = EXCLUDED.total_journal_entries,
    total_notifications_sent = EXCLUDED.total_notifications_sent;
  $$
);

-- View current cron jobs
SELECT * FROM cron.job;

-- To remove a cron job (if needed):
-- SELECT cron.unschedule('daily-checkin-6pm');