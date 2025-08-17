-- =============================================
-- Luma 3 Complete Monitoring System for Supabase
-- =============================================

-- 1. Settings Configuration Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.luma_settings (
  id              BIGSERIAL PRIMARY KEY,
  key             TEXT NOT NULL UNIQUE,
  value           TEXT NOT NULL,
  description     TEXT,
  category        TEXT DEFAULT 'general',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE public.luma_settings ENABLE ROW LEVEL SECURITY;

-- Policy for settings access
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'luma_settings_service_access' AND tablename = 'luma_settings') THEN
    CREATE POLICY luma_settings_service_access ON public.luma_settings
    FOR ALL TO authenticated, service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert default monitoring settings
INSERT INTO public.luma_settings (key, value, description, category) VALUES
  ('capacity_quota_gb', '8.0', 'Database storage quota in GB', 'monitoring'),
  ('capacity_warn_pct', '80', 'Warning threshold percentage', 'monitoring'),
  ('monitoring_enabled', 'true', 'Enable system monitoring', 'monitoring'),
  ('alert_email', 'admin@example.com', 'Admin email for alerts', 'monitoring')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add constraints for capacity settings
ALTER TABLE public.luma_settings 
DROP CONSTRAINT IF EXISTS check_capacity_settings;

ALTER TABLE public.luma_settings 
ADD CONSTRAINT check_capacity_settings 
CHECK (
  (key != 'capacity_quota_gb' OR value::numeric > 0) AND
  (key != 'capacity_warn_pct' OR (value::numeric BETWEEN 1 AND 99)) AND
  (key != 'monitoring_enabled' OR value IN ('true', 'false'))
);

-- 2. Capacity Reports Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.capacity_reports (
  id                BIGSERIAL PRIMARY KEY,
  collected_at      TIMESTAMPTZ DEFAULT NOW(),
  total_db_bytes    BIGINT NOT NULL DEFAULT 0,
  messages_bytes    BIGINT NOT NULL DEFAULT 0,
  summaries_bytes   BIGINT NOT NULL DEFAULT 0,
  longmem_bytes     BIGINT NOT NULL DEFAULT 0,
  sessions_bytes    BIGINT NOT NULL DEFAULT 0,
  messages_rows     BIGINT NOT NULL DEFAULT 0,
  longmem_rows      BIGINT NOT NULL DEFAULT 0,
  evaluation_bytes  BIGINT NOT NULL DEFAULT 0,
  feedback_bytes    BIGINT NOT NULL DEFAULT 0,
  nudges_bytes      BIGINT NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.capacity_reports ENABLE ROW LEVEL SECURITY;

-- Policy for capacity reports
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'capacity_reports_service_access' AND tablename = 'capacity_reports') THEN
    CREATE POLICY capacity_reports_service_access ON public.capacity_reports
    FOR ALL TO authenticated, service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_capacity_reports_time ON public.capacity_reports(collected_at DESC);

-- 3. System Performance Logs
-- =============================================
CREATE TABLE IF NOT EXISTS public.system_performance_logs (
  id                BIGSERIAL PRIMARY KEY,
  logged_at         TIMESTAMPTZ DEFAULT NOW(),
  api_endpoint      TEXT NOT NULL,
  response_time_ms  INTEGER NOT NULL,
  success_rate      NUMERIC(5,2),
  error_count       INTEGER DEFAULT 0,
  request_count     INTEGER NOT NULL DEFAULT 0,
  avg_tokens        INTEGER DEFAULT 0,
  model_used        TEXT,
  route_type        TEXT
);

-- Enable RLS
ALTER TABLE public.system_performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy for performance logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'performance_logs_service_access' AND tablename = 'system_performance_logs') THEN
    CREATE POLICY performance_logs_service_access ON public.system_performance_logs
    FOR ALL TO authenticated, service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes for performance logs
CREATE INDEX IF NOT EXISTS idx_performance_logs_time ON public.system_performance_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_endpoint ON public.system_performance_logs(api_endpoint, logged_at DESC);

-- 4. Alert History Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id            BIGSERIAL PRIMARY KEY,
  alert_type    TEXT NOT NULL, -- 'capacity_warning', 'performance_degradation', 'error_spike'
  severity      TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}'::JSONB,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for alerts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'monitoring_alerts_service_access' AND tablename = 'monitoring_alerts') THEN
    CREATE POLICY monitoring_alerts_service_access ON public.monitoring_alerts
    FOR ALL TO authenticated, service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Index for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_type_time ON public.monitoring_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.monitoring_alerts(severity, created_at DESC);

-- =============================================
-- MONITORING FUNCTIONS
-- =============================================

-- 1. Capacity Collection Function (Enhanced)
-- =============================================
CREATE OR REPLACE FUNCTION public.luma_collect_capacity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_messages_bytes    BIGINT;
    v_summaries_bytes   BIGINT;
    v_longmem_bytes     BIGINT;
    v_sessions_bytes    BIGINT;
    v_evaluation_bytes  BIGINT;
    v_feedback_bytes    BIGINT;
    v_nudges_bytes      BIGINT;
    v_total_db_bytes    BIGINT;
    v_messages_rows     BIGINT;
    v_longmem_rows      BIGINT;
    v_result            JSONB;
BEGIN
    BEGIN
        -- Collect table sizes
        v_messages_bytes := COALESCE(pg_total_relation_size('public.messages'), 0);
        v_summaries_bytes := COALESCE(pg_total_relation_size('public.session_summaries'), 0);
        v_longmem_bytes := COALESCE(pg_total_relation_size('public.user_long_memory'), 0);
        v_sessions_bytes := COALESCE(pg_total_relation_size('public.sessions'), 0);
        v_evaluation_bytes := COALESCE(pg_total_relation_size('public.evaluation_events'), 0);
        v_feedback_bytes := COALESCE(pg_total_relation_size('public.feedbacks'), 0);
        v_nudges_bytes := COALESCE(pg_total_relation_size('public.nudges'), 0);
        
        v_total_db_bytes := v_messages_bytes + v_summaries_bytes + v_longmem_bytes + 
                           v_sessions_bytes + v_evaluation_bytes + v_feedback_bytes + v_nudges_bytes;

        -- Collect row counts
        SELECT reltuples::BIGINT INTO v_messages_rows 
        FROM pg_class WHERE oid = 'public.messages'::regclass;
        v_messages_rows := COALESCE(v_messages_rows, 0);
        
        SELECT reltuples::BIGINT INTO v_longmem_rows 
        FROM pg_class WHERE oid = 'public.user_long_memory'::regclass;
        v_longmem_rows := COALESCE(v_longmem_rows, 0);

        -- Insert the report
        INSERT INTO public.capacity_reports(
            total_db_bytes, messages_bytes, summaries_bytes, longmem_bytes, 
            sessions_bytes, evaluation_bytes, feedback_bytes, nudges_bytes,
            messages_rows, longmem_rows
        ) VALUES (
            v_total_db_bytes, v_messages_bytes, v_summaries_bytes, v_longmem_bytes,
            v_sessions_bytes, v_evaluation_bytes, v_feedback_bytes, v_nudges_bytes,
            v_messages_rows, v_longmem_rows
        );

        -- Build result
        v_result := jsonb_build_object(
            'success', true,
            'collected_at', NOW(),
            'total_db_bytes', v_total_db_bytes,
            'total_gb', ROUND(v_total_db_bytes / 1024.0 / 1024.0 / 1024.0, 3),
            'breakdown', jsonb_build_object(
                'messages_bytes', v_messages_bytes,
                'summaries_bytes', v_summaries_bytes,
                'longmem_bytes', v_longmem_bytes,
                'sessions_bytes', v_sessions_bytes,
                'evaluation_bytes', v_evaluation_bytes,
                'feedback_bytes', v_feedback_bytes,
                'nudges_bytes', v_nudges_bytes
            ),
            'row_counts', jsonb_build_object(
                'messages_rows', v_messages_rows,
                'longmem_rows', v_longmem_rows
            )
        );

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- Log error and return failure
        RAISE WARNING 'Error in luma_collect_capacity: %', SQLERRM;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'collected_at', NOW()
        );
    END;
END;
$$;

-- 2. Capacity Status Function (Enhanced)
-- =============================================
CREATE OR REPLACE FUNCTION public.luma_capacity_status()
RETURNS TABLE(
    collected_at    TIMESTAMPTZ,
    total_bytes     BIGINT,
    used_gb         NUMERIC,
    quota_gb        NUMERIC,
    used_pct        NUMERIC,
    warn_pct        NUMERIC,
    is_warning      BOOLEAN,
    breakdown       JSONB,
    row_counts      JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_gb      NUMERIC;
    v_warn_pct      NUMERIC;
    v_last_report   RECORD;
BEGIN
    -- Retrieve settings with defaults
    BEGIN
        SELECT value::NUMERIC INTO v_quota_gb 
        FROM luma_settings WHERE key='capacity_quota_gb';
        v_quota_gb := COALESCE(v_quota_gb, 8.0);
        
        SELECT value::NUMERIC INTO v_warn_pct 
        FROM luma_settings WHERE key='capacity_warn_pct';
        v_warn_pct := COALESCE(v_warn_pct, 80);
    EXCEPTION WHEN OTHERS THEN
        v_quota_gb := 8.0;
        v_warn_pct := 80;
    END;

    -- Get the latest report
    SELECT * INTO v_last_report
    FROM capacity_reports
    ORDER BY collected_at DESC
    LIMIT 1;

    IF v_last_report.id IS NULL THEN
        RAISE EXCEPTION 'No capacity reports available. Run luma_collect_capacity() first.';
    END IF;

    -- Return capacity status
    RETURN QUERY
    SELECT
        v_last_report.collected_at,
        v_last_report.total_db_bytes,
        ROUND(v_last_report.total_db_bytes / 1024.0 / 1024.0 / 1024.0, 3),
        v_quota_gb,
        CASE 
            WHEN v_quota_gb > 0 
            THEN ROUND((v_last_report.total_db_bytes / 1024.0 / 1024.0 / 1024.0) / v_quota_gb * 100.0, 2) 
            ELSE NULL 
        END,
        v_warn_pct,
        CASE 
            WHEN v_quota_gb > 0 
            THEN ((v_last_report.total_db_bytes / 1024.0 / 1024.0 / 1024.0) / v_quota_gb * 100.0) >= v_warn_pct 
            ELSE false 
        END,
        jsonb_build_object(
            'messages_mb', ROUND(v_last_report.messages_bytes / 1024.0 / 1024.0, 2),
            'summaries_mb', ROUND(v_last_report.summaries_bytes / 1024.0 / 1024.0, 2),
            'longmem_mb', ROUND(v_last_report.longmem_bytes / 1024.0 / 1024.0, 2),
            'sessions_mb', ROUND(v_last_report.sessions_bytes / 1024.0 / 1024.0, 2),
            'evaluation_mb', ROUND(v_last_report.evaluation_bytes / 1024.0 / 1024.0, 2),
            'feedback_mb', ROUND(v_last_report.feedback_bytes / 1024.0 / 1024.0, 2),
            'nudges_mb', ROUND(v_last_report.nudges_bytes / 1024.0 / 1024.0, 2)
        ),
        jsonb_build_object(
            'messages_rows', v_last_report.messages_rows,
            'longmem_rows', v_last_report.longmem_rows
        );
END;
$$;

-- 3. Performance Logging Function
-- =============================================
CREATE OR REPLACE FUNCTION public.log_api_performance(
    p_endpoint TEXT,
    p_response_time_ms INTEGER,
    p_success_rate NUMERIC DEFAULT NULL,
    p_error_count INTEGER DEFAULT 0,
    p_request_count INTEGER DEFAULT 1,
    p_avg_tokens INTEGER DEFAULT NULL,
    p_model_used TEXT DEFAULT NULL,
    p_route_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.system_performance_logs (
        api_endpoint, response_time_ms, success_rate, error_count, 
        request_count, avg_tokens, model_used, route_type
    ) VALUES (
        p_endpoint, p_response_time_ms, p_success_rate, p_error_count,
        p_request_count, p_avg_tokens, p_model_used, p_route_type
    );
EXCEPTION WHEN OTHERS THEN
    -- Silent failure for performance logging
    RAISE WARNING 'Failed to log performance: %', SQLERRM;
END;
$$;

-- 4. Create Alert Function
-- =============================================
CREATE OR REPLACE FUNCTION public.create_monitoring_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alert_id BIGINT;
BEGIN
    INSERT INTO public.monitoring_alerts (
        alert_type, severity, title, message, metadata
    ) VALUES (
        p_alert_type, p_severity, p_title, p_message, p_metadata
    ) RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create alert: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 5. Check Capacity and Create Alerts
-- =============================================
CREATE OR REPLACE FUNCTION public.check_capacity_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status RECORD;
    v_alert_id BIGINT;
    v_result JSONB;
BEGIN
    -- Get current capacity status
    SELECT * INTO v_status FROM luma_capacity_status() LIMIT 1;
    
    IF v_status.is_warning THEN
        -- Check if we already have a recent warning
        IF NOT EXISTS (
            SELECT 1 FROM monitoring_alerts 
            WHERE alert_type = 'capacity_warning' 
            AND resolved_at IS NULL
            AND created_at > NOW() - INTERVAL '1 hour'
        ) THEN
            -- Create capacity warning alert
            SELECT public.create_monitoring_alert(
                'capacity_warning',
                CASE WHEN v_status.used_pct >= 95 THEN 'critical' ELSE 'warning' END,
                'Database Capacity Warning',
                format('Database usage at %.2f%% (%.2f GB of %.2f GB)', 
                       v_status.used_pct, v_status.used_gb, v_status.quota_gb),
                jsonb_build_object(
                    'used_gb', v_status.used_gb,
                    'quota_gb', v_status.quota_gb,
                    'used_pct', v_status.used_pct,
                    'breakdown', v_status.breakdown
                )
            ) INTO v_alert_id;
        END IF;
    END IF;

    v_result := jsonb_build_object(
        'capacity_check_completed', true,
        'is_warning', v_status.is_warning,
        'used_pct', v_status.used_pct,
        'alert_created', v_alert_id IS NOT NULL,
        'alert_id', v_alert_id
    );
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 6. System Health Summary
-- =============================================
CREATE OR REPLACE FUNCTION public.system_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_capacity RECORD;
    v_recent_alerts INTEGER;
    v_performance RECORD;
    v_result JSONB;
BEGIN
    -- Get capacity status
    SELECT * INTO v_capacity FROM luma_capacity_status() LIMIT 1;
    
    -- Count recent alerts
    SELECT COUNT(*) INTO v_recent_alerts
    FROM monitoring_alerts
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    -- Get average performance from last 24h
    SELECT 
        AVG(response_time_ms)::INTEGER as avg_response_time,
        AVG(success_rate) as avg_success_rate,
        SUM(error_count) as total_errors,
        SUM(request_count) as total_requests
    INTO v_performance
    FROM system_performance_logs
    WHERE logged_at > NOW() - INTERVAL '24 hours';
    
    v_result := jsonb_build_object(
        'timestamp', NOW(),
        'overall_health', CASE 
            WHEN v_capacity.is_warning OR v_recent_alerts > 10 THEN 'warning'
            WHEN v_recent_alerts > 0 THEN 'caution'
            ELSE 'healthy'
        END,
        'capacity', jsonb_build_object(
            'used_gb', v_capacity.used_gb,
            'quota_gb', v_capacity.quota_gb,
            'used_pct', v_capacity.used_pct,
            'is_warning', v_capacity.is_warning
        ),
        'performance_24h', jsonb_build_object(
            'avg_response_time_ms', COALESCE(v_performance.avg_response_time, 0),
            'avg_success_rate', COALESCE(v_performance.avg_success_rate, 100),
            'total_errors', COALESCE(v_performance.total_errors, 0),
            'total_requests', COALESCE(v_performance.total_requests, 0)
        ),
        'alerts_24h', v_recent_alerts,
        'active_alerts', (
            SELECT COUNT(*) FROM monitoring_alerts 
            WHERE resolved_at IS NULL
        )
    );
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$;

-- =============================================
-- AUTO-UPDATE FUNCTIONS
-- =============================================

-- Update timestamps on settings changes
CREATE OR REPLACE FUNCTION update_luma_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for settings updates
DROP TRIGGER IF EXISTS trigger_luma_settings_updated_at ON public.luma_settings;
CREATE TRIGGER trigger_luma_settings_updated_at
    BEFORE UPDATE ON public.luma_settings
    FOR EACH ROW EXECUTE FUNCTION update_luma_settings_timestamp();

-- =============================================
-- UTILITY QUERIES FOR MONITORING DASHBOARD
-- =============================================

-- Query: Get capacity trends (last 7 days)
/*
SELECT 
    DATE(collected_at) as date,
    MAX(total_db_bytes / 1024.0 / 1024.0 / 1024.0) as max_gb_used,
    AVG(total_db_bytes / 1024.0 / 1024.0 / 1024.0) as avg_gb_used
FROM capacity_reports 
WHERE collected_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(collected_at)
ORDER BY date;
*/

-- Query: Get recent alerts
/*
SELECT 
    alert_type,
    severity,
    title,
    created_at,
    resolved_at IS NULL as is_active
FROM monitoring_alerts 
ORDER BY created_at DESC 
LIMIT 20;
*/

-- Query: Performance trends by endpoint
/*
SELECT 
    api_endpoint,
    DATE(logged_at) as date,
    AVG(response_time_ms) as avg_response_time,
    AVG(success_rate) as avg_success_rate,
    SUM(request_count) as total_requests
FROM system_performance_logs
WHERE logged_at > NOW() - INTERVAL '7 days'
GROUP BY api_endpoint, DATE(logged_at)
ORDER BY date DESC, api_endpoint;
*/

-- Complete setup message
DO $$
BEGIN
    RAISE NOTICE '✅ Luma 3 Monitoring System installed successfully!';
    RAISE NOTICE '📊 Tables: luma_settings, capacity_reports, system_performance_logs, monitoring_alerts';
    RAISE NOTICE '🔧 Functions: luma_collect_capacity(), luma_capacity_status(), system_health_summary()';
    RAISE NOTICE '⚡ Next steps: Run SELECT luma_collect_capacity(); to initialize monitoring';
END $$;