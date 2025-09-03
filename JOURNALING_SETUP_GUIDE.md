# 📱 Journaling & Daily Check-in System Setup Guide

## **Overview**

This system provides:
- 🧠 **Daily Check-ins**: Personalized notifications using Claude Haiku
- ✍️ **Journal Entry Submission**: Secure API for Android app
- 📊 **User Analytics**: Track engagement and journaling habits
- 🔔 **Push Notifications**: FCM integration for Android

## **🚀 Setup Steps**

### **Step 1: Database Setup**

1. **Open Supabase Dashboard → SQL Editor**
2. **Run the journaling system schema:**
   ```bash
   # Execute: journaling-system-schema.sql
   ```
   This creates:
   - `journal_entries` - User's journal content
   - `user_device_tokens` - FCM device registration
   - `notifications_log` - Delivery tracking
   - `user_notification_preferences` - User settings

### **Step 2: Environment Variables**

1. **Copy `.env.example` to `.env`**
2. **Fill in your credentials:**
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ANTHROPIC_API_KEY=your-claude-api-key
   FCM_PROJECT_ID=your-firebase-project
   FCM_SERVICE_ACCOUNT_KEY={"type":"service_account"...}
   ```

### **Step 3: Deploy Edge Functions**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy daily-checkin-generator
supabase functions deploy submit-journal-entry

# Set environment secrets
supabase secrets set ANTHROPIC_API_KEY=your-claude-key
supabase secrets set FCM_SERVICE_ACCOUNT_KEY='{"type":"service_account"...}'
```

### **Step 4: Set Up Cron Jobs**

1. **In Supabase SQL Editor, run:**
   ```sql
   -- Execute: cron-config.sql
   ```
   This schedules:
   - Daily check-ins at 6 PM
   - Weekly log cleanup
   - Daily engagement analytics

### **Step 5: Firebase Setup**

1. **Create Firebase project**
2. **Enable Cloud Messaging**
3. **Generate service account key**
4. **Add key to Supabase secrets**

## **🧪 Testing**

### **Test Journal Entry Submission**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/submit-journal-entry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-service-role-key" \
  -d '{
    "user_id": "test-user-uuid",
    "prompt": "Write about your biggest challenge today.",
    "content": "Today I struggled with time management, but I learned to prioritize better."
  }'
```

### **Test Daily Check-in Generator**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/daily-checkin-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-service-role-key" \
  -d '{"source": "manual_test"}'
```

### **Verify Database**

```sql
-- Check journal entries
SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 5;

-- Check notifications log
SELECT * FROM notifications_log ORDER BY sent_at DESC LIMIT 5;

-- Check active users
SELECT * FROM active_users_24h;
```

## **📱 Android Integration**

### **1. Add Dependencies**

```kotlin
// In your Android app's build.gradle
implementation 'com.google.firebase:firebase-messaging:23.4.0'
implementation 'io.github.jan-tennert.supabase:postgrest-kt:2.0.0'
```

### **2. Initialize Supabase Client**

```typescript
import { submitJournalEntry, registerDeviceToken } from './supabase-client';

// Submit journal entry
const result = await submitJournalEntry(
  userId, 
  prompt, 
  userContent
);

if (result.success) {
  showSuccessMessage("Journal saved!");
} else {
  showErrorMessage(result.error);
}
```

### **3. Register for Push Notifications**

```typescript
// Get FCM token and register with Supabase
const fcmToken = await messaging().getToken();
await registerDeviceToken(userId, fcmToken, 'android');
```

## **🔍 Monitoring & Analytics**

### **Key Metrics to Track**

```sql
-- Daily active journalers
SELECT COUNT(DISTINCT user_id) as daily_journalers 
FROM journal_entries 
WHERE created_at::date = CURRENT_DATE;

-- Notification delivery rates
SELECT 
  notification_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
  ROUND(COUNT(*) FILTER (WHERE delivery_status = 'delivered') * 100.0 / COUNT(*), 2) as delivery_rate
FROM notifications_log 
WHERE sent_at::date = CURRENT_DATE
GROUP BY notification_type;

-- User engagement over time
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_entries,
  ROUND(AVG(word_count), 1) as avg_words_per_entry
FROM journal_entries 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

## **🐛 Troubleshooting**

### **Common Issues**

1. **Functions not deploying:**
   ```bash
   # Check function logs
   supabase functions logs daily-checkin-generator
   ```

2. **Claude API errors:**
   ```bash
   # Verify API key is set
   supabase secrets list
   ```

3. **FCM notifications not sending:**
   - Check Firebase project configuration
   - Verify service account permissions
   - Test with FCM testing tools

4. **Database permissions:**
   ```sql
   -- Verify RLS policies
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables WHERE schemaname = 'public';
   ```

### **Debug Mode**

Add to Edge Functions for detailed logging:
```typescript
console.log('DEBUG: Processing user:', user);
console.log('DEBUG: Generated message:', message);
```

## **🔒 Security Considerations**

- ✅ **Row Level Security** enabled on all tables
- ✅ **Service role key** only in Edge Functions
- ✅ **User input validation** for journal entries
- ✅ **Rate limiting** on FCM notifications
- ✅ **Encrypted device tokens** in database

## **📈 Performance Optimization**

- **Database indexes** on frequently queried columns
- **Batch processing** for daily notifications
- **Connection pooling** in Edge Functions
- **Caching** for user preferences
- **Cleanup jobs** for old logs

## **🎯 Success Metrics**

When working properly, you should see:
- ✅ Users receiving personalized daily check-ins at 6 PM
- ✅ Journal entries saving successfully from Android app
- ✅ Notification logs showing delivery status
- ✅ User engagement analytics updating daily
- ✅ Zero database permission errors

This system transforms Luma into a comprehensive journaling and check-in platform with intelligent, personalized notifications powered by Claude AI! 🚀