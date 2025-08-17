-- API Incidents Table for Guard System
-- 记录API调用事件和降级情况

CREATE TABLE IF NOT EXISTS public.api_incidents (
  id              BIGSERIAL PRIMARY KEY,
  route           TEXT NOT NULL,  -- 'triage', 'reason32B', 'reason70B', 'empathy'
  model           TEXT NOT NULL,  -- 模型名称
  incident_type   TEXT NOT NULL,  -- 'failure', 'timeout', 'rate_limit', 'degradation', 'recovery', 'circuit_breaker_opened'
  details         TEXT,           -- JSON字符串，包含错误详情
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_incidents ENABLE ROW LEVEL SECURITY;

-- Policy for API incidents
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'api_incidents_service_access' AND tablename = 'api_incidents') THEN
    CREATE POLICY api_incidents_service_access ON public.api_incidents
    FOR ALL TO authenticated, service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_incidents_route_time ON public.api_incidents(route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_incidents_type_time ON public.api_incidents(incident_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_incidents_model ON public.api_incidents(model, created_at DESC);

-- Function to get API reliability statistics
CREATE OR REPLACE FUNCTION public.get_api_reliability_stats(
    p_route TEXT DEFAULT NULL,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    route TEXT,
    model TEXT,
    total_incidents INTEGER,
    failures INTEGER,
    timeouts INTEGER,
    rate_limits INTEGER,
    degradations INTEGER,
    circuit_breaker_events INTEGER,
    reliability_score NUMERIC,
    last_incident TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH incident_stats AS (
        SELECT 
            ai.route,
            ai.model,
            COUNT(*) as total_incidents,
            COUNT(CASE WHEN ai.incident_type = 'failure' THEN 1 END) as failures,
            COUNT(CASE WHEN ai.incident_type = 'timeout' THEN 1 END) as timeouts,
            COUNT(CASE WHEN ai.incident_type = 'rate_limit' THEN 1 END) as rate_limits,
            COUNT(CASE WHEN ai.incident_type = 'degradation' THEN 1 END) as degradations,
            COUNT(CASE WHEN ai.incident_type = 'circuit_breaker_opened' THEN 1 END) as circuit_breaker_events,
            MAX(ai.created_at) as last_incident
        FROM api_incidents ai
        WHERE ai.created_at > NOW() - INTERVAL '1 hour' * p_hours
        AND (p_route IS NULL OR ai.route = p_route)
        GROUP BY ai.route, ai.model
    )
    SELECT 
        s.route,
        s.model,
        s.total_incidents::INTEGER,
        s.failures::INTEGER,
        s.timeouts::INTEGER,
        s.rate_limits::INTEGER,
        s.degradations::INTEGER,
        s.circuit_breaker_events::INTEGER,
        -- 可靠性评分：基于事件类型和频率
        CASE 
            WHEN s.total_incidents = 0 THEN 100.0
            ELSE GREATEST(0, 100.0 - (
                s.failures * 10.0 + 
                s.timeouts * 5.0 + 
                s.rate_limits * 2.0 + 
                s.degradations * 3.0 + 
                s.circuit_breaker_events * 15.0
            ) / GREATEST(1, p_hours) * 24)
        END::NUMERIC(5,2) as reliability_score,
        s.last_incident
    FROM incident_stats s
    ORDER BY s.route, s.model;
$$;

-- Function to get recent API incidents for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_api_incidents(
    p_limit INTEGER DEFAULT 50,
    p_route TEXT DEFAULT NULL,
    p_incident_type TEXT DEFAULT NULL
)
RETURNS TABLE(
    id BIGINT,
    route TEXT,
    model TEXT,
    incident_type TEXT,
    details TEXT,
    created_at TIMESTAMPTZ,
    hours_ago NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ai.id,
        ai.route,
        ai.model,
        ai.incident_type,
        ai.details,
        ai.created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - ai.created_at)) / 3600, 2) as hours_ago
    FROM api_incidents ai
    WHERE (p_route IS NULL OR ai.route = p_route)
    AND (p_incident_type IS NULL OR ai.incident_type = p_incident_type)
    ORDER BY ai.created_at DESC
    LIMIT p_limit;
$$;

-- Function to clean old incidents (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_incidents(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_incidents 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Sample data insertion (for testing)
INSERT INTO public.api_incidents (route, model, incident_type, details) VALUES
('empathy', 'MentaLLaMA-7B', 'degradation', '{"failureType": "timeout", "originalError": "Request timeout"}'),
('reason32B', 'Qwen2.5-32B-Instruct', 'rate_limit', '{"status": 429, "message": "Rate limit exceeded"}'),
('triage', 'BERT-sentiment', 'failure', '{"status": 503, "message": "Service unavailable"}')
ON CONFLICT DO NOTHING;

-- Usage examples:
-- SELECT * FROM get_api_reliability_stats();  -- All routes, last 24h
-- SELECT * FROM get_api_reliability_stats('empathy', 12);  -- Empathy route, last 12h
-- SELECT * FROM get_recent_api_incidents(20, 'reason70B');  -- Recent incidents for 70B reasoning
-- SELECT cleanup_old_api_incidents(7);  -- Clean incidents older than 7 days

DO $$
BEGIN
    RAISE NOTICE '✅ API Incidents table and functions created successfully!';
    RAISE NOTICE '📊 Use get_api_reliability_stats() to view reliability metrics';
    RAISE NOTICE '🔍 Use get_recent_api_incidents() to view recent incidents';
    RAISE NOTICE '🧹 Use cleanup_old_api_incidents() for maintenance';
END $$;