-- Supabase schema for Luma 3 evaluation and notification system

-- 1. Router thresholds table (already exists, but here for completeness)
CREATE TABLE IF NOT EXISTS router_thresholds (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_length_for_reasoning INTEGER DEFAULT 600,
  keywords TEXT[] DEFAULT ARRAY['为什么','原因','分析','计划','步骤','优缺点','复盘','reframe'],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default values
INSERT INTO router_thresholds (id, min_length_for_reasoning, keywords) 
VALUES (1, 600, ARRAY['为什么','原因','分析','计划','步骤','优缺点','复盘','reframe'])
ON CONFLICT (id) DO NOTHING;

-- 2. Evaluation events table
CREATE TABLE IF NOT EXISTS evaluation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  route_type TEXT, -- 'empathy', 'reason32B->empathy', 'reason70B->empathy'
  triage_label TEXT,
  is_crisis BOOLEAN DEFAULT FALSE,
  outline_tokens INTEGER DEFAULT 0,
  reply_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Evaluation judgments table  
CREATE TABLE IF NOT EXISTS evaluation_judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  message_content TEXT,
  reply_content TEXT,
  judge_score INTEGER CHECK (judge_score >= 1 AND judge_score <= 5),
  judge_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Devices table for push notifications
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  device_token TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT DEFAULT 'care', -- 'care', 'followup', 'reminder'
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. User activity tracking for notifications
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  last_active TIMESTAMP DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0, -- in minutes
  crisis_episodes INTEGER DEFAULT 0,
  last_crisis_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Functions

-- Function for metrics summary (last 24h)
CREATE OR REPLACE FUNCTION metrics_summary_last24h()
RETURNS TABLE (
  total_conversations INTEGER,
  crisis_episodes INTEGER,
  avg_latency_ms NUMERIC,
  route_breakdown JSONB,
  avg_judge_score NUMERIC,
  feedback_avg NUMERIC,
  active_users INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ee.session_id)::INTEGER as total_conversations,
    COUNT(CASE WHEN ee.is_crisis THEN 1 END)::INTEGER as crisis_episodes,
    ROUND(AVG(ee.latency_ms), 2) as avg_latency_ms,
    COALESCE(
      jsonb_object_agg(ee.route_type, route_counts.cnt), 
      '{}'::jsonb
    ) as route_breakdown,
    ROUND(AVG(ej.judge_score), 2) as avg_judge_score,
    ROUND(AVG(f.rating), 2) as feedback_avg,
    COUNT(DISTINCT ee.user_id)::INTEGER as active_users
  FROM evaluation_events ee
  LEFT JOIN evaluation_judgments ej ON ej.session_id = ee.session_id 
    AND ej.created_at >= NOW() - INTERVAL '24 hours'
  LEFT JOIN feedbacks f ON f.session_id = ee.session_id 
    AND f.created_at >= NOW() - INTERVAL '24 hours'
  LEFT JOIN (
    SELECT route_type, COUNT(*) as cnt
    FROM evaluation_events 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY route_type
  ) route_counts ON route_counts.route_type = ee.route_type
  WHERE ee.created_at >= NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id TEXT, p_is_crisis BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_activity (user_id, last_active, total_sessions, crisis_episodes, last_crisis_at)
  VALUES (
    p_user_id, 
    NOW(), 
    1, 
    CASE WHEN p_is_crisis THEN 1 ELSE 0 END,
    CASE WHEN p_is_crisis THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_active = NOW(),
    total_sessions = user_activity.total_sessions + 1,
    crisis_episodes = user_activity.crisis_episodes + CASE WHEN p_is_crisis THEN 1 ELSE 0 END,
    last_crisis_at = CASE WHEN p_is_crisis THEN NOW() ELSE user_activity.last_crisis_at END,
    updated_at = NOW();
END;
$$;

-- Function to get users needing care nudges
CREATE OR REPLACE FUNCTION get_users_needing_care()
RETURNS TABLE (
  user_id TEXT,
  days_inactive INTEGER,
  crisis_episodes INTEGER,
  last_crisis_days INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    EXTRACT(DAY FROM (NOW() - ua.last_active))::INTEGER as days_inactive,
    ua.crisis_episodes,
    CASE 
      WHEN ua.last_crisis_at IS NOT NULL 
      THEN EXTRACT(DAY FROM (NOW() - ua.last_crisis_at))::INTEGER
      ELSE NULL 
    END as last_crisis_days
  FROM user_activity ua
  WHERE 
    (ua.last_active < NOW() - INTERVAL '3 days') -- 3+ days inactive
    OR (ua.last_crisis_at IS NOT NULL AND ua.last_crisis_at < NOW() - INTERVAL '7 days' AND ua.last_crisis_at > NOW() - INTERVAL '30 days') -- had crisis 1-4 weeks ago
  ORDER BY ua.last_active DESC;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evaluation_events_created_at ON evaluation_events(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_events_user_session ON evaluation_events(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_judgments_created_at ON evaluation_judgments(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_activity_last_active ON user_activity(last_active);

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE evaluation_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE evaluation_judgments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;