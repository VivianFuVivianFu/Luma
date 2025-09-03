# Manual Supabase Edge Functions Deployment Guide

Since the CLI installation has issues, here's how to deploy manually through the dashboard:

## Step 1: Deploy Daily Check-in Generator

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Project → Edge Functions → Create Function
3. **Function Name**: `daily-checkin-generator`
4. **Copy and paste the entire content** from: `supabase/functions/daily-checkin-generator/index.ts`

## Step 2: Deploy Submit Journal Entry

1. **Create another function** in Supabase Dashboard
2. **Function Name**: `submit-journal-entry`  
3. **Copy and paste the entire content** from: `supabase/functions/submit-journal-entry/index.ts`

## Step 3: Set Environment Variables

**In Supabase Dashboard → Settings → Edge Functions → Environment Variables**, add:

```
ANTHROPIC_API_KEY=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
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cXpsanVuYWZqZnV3ZGVkamVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY1ODIwNiwiZXhwIjoyMDcwMjM0MjA2fQ.eUbnUfEeXJ7p7SCTBS3-MuUPglnR8ztIiqqsZgHruUg
```

## Step 4: Deploy Database Schema

**In Supabase Dashboard → SQL Editor**, run the content from: `journaling-system-schema.sql`

## Step 5: Create Cron Job

**In Supabase Dashboard → SQL Editor**, run:

```sql
-- Enable pg_cron extension first
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check-ins at 6 PM (18:00) every day
SELECT cron.schedule(
  'daily-user-checkin',
  '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://oyqzljunafjfuwdedjee.supabase.co/functions/v1/daily-checkin-generator',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cXpsanVuYWZqZnV3ZGVkamVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY1ODIwNiwiZXhwIjoyMDcwMjM0MjA2fQ.eUbnUfEeXJ7p7SCTBS3-MuUPglnR8ztIiqqsZgHruUg", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );$$
);
```

Follow this guide step by step in your browser!