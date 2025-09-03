# Cron Job Setup Guide for Daily Check-ins

## 📅 **Step 1: Set up the Cron Job in Supabase**

1. **Go to Supabase Dashboard SQL Editor**: 
   https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee/sql

2. **Run this SQL code** to set up the cron job:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check-in generator to run at 6 PM every day
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
```

3. **Verify the cron job was created**:
```sql
SELECT * FROM cron.job;
```

## 🔧 **Step 2: Configure Service Role Key Setting**

The cron job needs access to your service role key. Run this SQL:

```sql
-- Set the service role key as a database setting
-- Replace 'your-service-role-key-here' with your actual service role key
ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key-here';
```

## ⚙️ **Step 3: Alternative Manual Setup**

If you prefer to set this up manually via database settings:

1. Go to **Settings** → **Database** in your Supabase dashboard
2. Add this custom configuration:
   - **Key**: `app.service_role_key`
   - **Value**: Your service role key from Settings → API

## 🧪 **Step 4: Test the Cron Job**

### Manual Test (Run immediately):
```sql
-- Test the daily check-in function manually
SELECT net.http_post(
  url := 'https://oyqzljunafjfuwdedjee.supabase.co/functions/v1/daily-checkin-generator',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
  body := '{"source": "manual_test", "timestamp": "' || NOW() || '"}'
) as request_id;
```

### Check Cron Job Status:
```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname = 'daily-checkin-6pm'
) ORDER BY start_time DESC LIMIT 10;
```

## 🕰️ **Cron Schedule Options**

| Schedule | Expression | Description |
|----------|------------|-------------|
| Daily 6 PM | `0 18 * * *` | Every day at 6:00 PM |
| Daily 9 AM | `0 9 * * *` | Every day at 9:00 AM |
| Twice daily | `0 9,18 * * *` | 9 AM and 6 PM daily |
| Weekdays only | `0 18 * * 1-5` | 6 PM on weekdays |

## 🚨 **Troubleshooting**

### If cron job fails:
1. **Check permissions**: Ensure `pg_cron` extension is enabled
2. **Verify service key**: Make sure `app.service_role_key` setting is correct
3. **Check function logs**: Go to Functions → Logs in Supabase dashboard
4. **Test manually**: Run the manual test SQL above

### Remove a cron job if needed:
```sql
SELECT cron.unschedule('daily-checkin-6pm');
```

## ✅ **Expected Result**

Once set up, your daily check-in function will:
1. Run automatically at 6 PM daily
2. Check for active users (users who had conversations in last 24h)
3. Generate personalized check-in messages using Claude
4. Send push notifications via FCM
5. Log all notifications in the database

The function will process all active users and send them personalized daily check-in messages!