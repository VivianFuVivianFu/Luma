-- =====================================================
-- JOURNALING & CHECK-IN SYSTEM DATABASE SCHEMA
-- For Android app with FCM notifications
-- =====================================================

-- 1. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER GENERATED ALWAYS AS (array_length(string_to_array(trim(content), ' '), 1)) STORED,
  sentiment_score DECIMAL(3,2) DEFAULT NULL, -- Optional: for future sentiment analysis
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER DEVICE TOKENS TABLE (for FCM)
CREATE TABLE IF NOT EXISTS user_device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  app_version TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- 3. NOTIFICATIONS LOG TABLE (for auditing)
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('daily_checkin', 'journal_reminder', 'milestone')),
  message TEXT NOT NULL,
  fcm_message_id TEXT, -- Firebase Cloud Messaging response ID
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER PREFERENCES TABLE (for notification settings)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_checkin_enabled BOOLEAN DEFAULT TRUE,
  daily_checkin_time TIME DEFAULT '18:00:00', -- 6 PM default
  timezone TEXT DEFAULT 'UTC',
  journal_reminders_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, created_at DESC);

-- Device tokens indexes
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON user_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON user_device_tokens(is_active) WHERE is_active = TRUE;

-- Notifications log indexes
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type ON notifications_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status ON notifications_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_at ON notifications_log(sent_at DESC);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;   
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE OR REPLACE TRIGGER update_journal_entries_updated_at 
  BEFORE UPDATE ON journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_device_tokens_updated_at 
  BEFORE UPDATE ON user_device_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notification_preferences_updated_at 
  BEFORE UPDATE ON user_notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Journal entries: Users can only access their own entries
CREATE POLICY "Users can access own journal entries" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

-- Device tokens: Users can manage their own device tokens
CREATE POLICY "Users can manage own device tokens" ON user_device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Notifications log: Users can view their own notification history
CREATE POLICY "Users can view own notification logs" ON notifications_log
  FOR SELECT USING (auth.uid() = user_id);

-- Notification preferences: Users can manage their own preferences
CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View for recent journal entries with user info
CREATE OR REPLACE VIEW recent_journal_entries AS
SELECT 
  je.*,
  up.display_name,
  NULL as avatar_url,
  ROW_NUMBER() OVER (PARTITION BY je.user_id ORDER BY je.created_at DESC) as entry_rank
FROM journal_entries je
LEFT JOIN profiles up ON je.user_id = up.user_id
ORDER BY je.created_at DESC;

-- View for active users (had activity in last 24 hours)
CREATE OR REPLACE VIEW active_users_24h AS
SELECT DISTINCT
  m.user_id,
  up.display_name,
  NULL as avatar_url,
  udt.device_token,
  unp.daily_checkin_enabled,
  unp.daily_checkin_time,
  unp.timezone
FROM messages m
LEFT JOIN profiles up ON m.user_id = up.user_id
LEFT JOIN user_device_tokens udt ON m.user_id = udt.user_id AND udt.is_active = TRUE
LEFT JOIN user_notification_preferences unp ON m.user_id = unp.user_id
WHERE m.created_at >= NOW() - INTERVAL '24 hours'
  AND udt.device_token IS NOT NULL
  AND (unp.daily_checkin_enabled IS NULL OR unp.daily_checkin_enabled = TRUE);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's recent conversation transcript
CREATE OR REPLACE FUNCTION get_user_recent_transcript(target_user_id UUID, hours_back INTEGER DEFAULT 24)
RETURNS TEXT AS $$
DECLARE
  transcript TEXT;
BEGIN
  SELECT string_agg(
    CASE 
      WHEN role = 'user' THEN 'User: ' || content
      WHEN role = 'assistant' THEN 'Chatbot: ' || content
    END, E'\n' ORDER BY created_at ASC
  ) INTO transcript
  FROM messages 
  WHERE user_id = target_user_id 
    AND created_at >= NOW() - (hours_back || ' hours')::INTERVAL
  LIMIT 20; -- Limit to last 20 messages to keep transcript manageable
  
  RETURN COALESCE(transcript, 'No recent conversation found.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log notification delivery
CREATE OR REPLACE FUNCTION log_notification(
  target_user_id UUID,
  notification_type TEXT,
  message TEXT,
  fcm_message_id TEXT DEFAULT NULL,
  delivery_status TEXT DEFAULT 'sent'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO notifications_log (
    user_id, 
    notification_type, 
    message, 
    fcm_message_id, 
    delivery_status
  ) VALUES (
    target_user_id, 
    notification_type, 
    message, 
    fcm_message_id, 
    delivery_status
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS FOR SERVICE ROLE
-- =====================================================

-- Grant permissions for Edge Functions to access all tables
GRANT ALL ON journal_entries TO service_role;
GRANT ALL ON user_device_tokens TO service_role;
GRANT ALL ON notifications_log TO service_role;
GRANT ALL ON user_notification_preferences TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_recent_transcript(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION log_notification(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;