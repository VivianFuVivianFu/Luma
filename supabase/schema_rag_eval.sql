-- RAG Evaluation System Schema
-- Creates tables for tracking retrieval performance and managing re-embedding jobs
-- Use CREATE IF NOT EXISTS to safely run multiple times

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Retrieval Logs Table
-- Tracks all vector search queries and their performance metrics
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    topk INTEGER NOT NULL DEFAULT 5,
    chunk_ids BIGINT[] NULL,  -- Array of chunk IDs returned by search
    score_mean FLOAT8 NOT NULL DEFAULT 0,  -- Average similarity score
    outcome TEXT NOT NULL DEFAULT 'success',  -- success | error | hallucination_suspected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_topk CHECK (topk > 0 AND topk <= 50),
    CONSTRAINT valid_score CHECK (score_mean >= 0 AND score_mean <= 1),
    CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'error', 'hallucination_suspected'))
);

-- Index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_user_created 
ON retrieval_logs (user_id, created_at DESC);

-- Index for performance analysis queries
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_score_outcome 
ON retrieval_logs (score_mean, outcome, created_at DESC);

-- Index Jobs Table
-- Queue for re-embedding and index maintenance tasks
CREATE TABLE IF NOT EXISTS index_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_type TEXT NOT NULL,  -- 'reembed' | future types
    reason TEXT NOT NULL,  -- 'low_score' | 'hallucinations' | 'manual'
    payload JSONB NULL,  -- Job-specific configuration and metadata
    status TEXT NOT NULL DEFAULT 'queued',  -- queued | running | done | failed
    error_message TEXT NULL,  -- Error details if status = 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL,
    
    -- Constraints
    CONSTRAINT valid_job_type CHECK (job_type IN ('reembed')),
    CONSTRAINT valid_status CHECK (status IN ('queued', 'running', 'done', 'failed')),
    CONSTRAINT finished_when_done CHECK (
        (status IN ('done', 'failed') AND finished_at IS NOT NULL) OR
        (status IN ('queued', 'running') AND finished_at IS NULL)
    )
);

-- Index for job queue processing
CREATE INDEX IF NOT EXISTS idx_index_jobs_status_created 
ON index_jobs (status, created_at ASC);

-- Index for job history and monitoring
CREATE INDEX IF NOT EXISTS idx_index_jobs_type_finished 
ON index_jobs (job_type, finished_at DESC NULLS FIRST);

-- Nudges Table
-- Email notifications and user follow-ups
CREATE TABLE IF NOT EXISTS nudges (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'followup_24h' | 'knowledge_update' | 'maintenance_alert'
    payload JSONB NULL,  -- Template data and configuration
    scheduled_at TIMESTAMPTZ NOT NULL,  -- When to send
    sent_at TIMESTAMPTZ NULL,  -- When actually sent
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed | cancelled
    error_message TEXT NULL,  -- Error details if status = 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_nudge_type CHECK (type IN ('followup_24h', 'knowledge_update', 'maintenance_alert')),
    CONSTRAINT valid_nudge_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT sent_when_delivered CHECK (
        (status = 'sent' AND sent_at IS NOT NULL) OR
        (status != 'sent' AND sent_at IS NULL)
    )
);

-- Index for nudge scheduling and processing
CREATE INDEX IF NOT EXISTS idx_nudges_status_scheduled 
ON nudges (status, scheduled_at ASC);

-- Index for user nudge history
CREATE INDEX IF NOT EXISTS idx_nudges_user_type_created 
ON nudges (user_id, type, created_at DESC);

-- Functions for automated cleanup and maintenance

-- Function to clean up old retrieval logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_retrieval_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM retrieval_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old retrieval logs', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get retrieval performance metrics
CREATE OR REPLACE FUNCTION get_retrieval_metrics(
    hours_back INTEGER DEFAULT 24,
    user_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_queries BIGINT,
    avg_score FLOAT8,
    low_score_count BIGINT,
    error_count BIGINT,
    hallucination_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_queries,
        AVG(score_mean) as avg_score,
        COUNT(*) FILTER (WHERE score_mean < 0.55) as low_score_count,
        COUNT(*) FILTER (WHERE outcome = 'error') as error_count,
        COUNT(*) FILTER (WHERE outcome = 'hallucination_suspected') as hallucination_count
    FROM retrieval_logs 
    WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    AND (user_filter IS NULL OR user_id = user_filter);
END;
$$ LANGUAGE plpgsql;

-- Function to schedule nudges
CREATE OR REPLACE FUNCTION schedule_nudge(
    p_user_id TEXT,
    p_type TEXT,
    p_payload JSONB DEFAULT NULL,
    p_delay_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    nudge_id UUID;
BEGIN
    INSERT INTO nudges (
        user_id,
        type,
        payload,
        scheduled_at
    ) VALUES (
        p_user_id,
        p_type,
        p_payload,
        NOW() + (p_delay_hours || ' hours')::INTERVAL
    ) RETURNING id INTO nudge_id;
    
    RETURN nudge_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies if needed
-- Uncomment and modify based on your authentication setup

-- ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own retrieval logs" 
-- ON retrieval_logs FOR SELECT 
-- USING (auth.uid()::text = user_id);

-- ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own nudges" 
-- ON nudges FOR SELECT 
-- USING (auth.uid()::text = user_id);

-- Grant permissions (adjust based on your service role needs)
-- GRANT SELECT, INSERT, UPDATE ON retrieval_logs TO service_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON index_jobs TO service_role;
-- GRANT SELECT, INSERT, UPDATE ON nudges TO service_role;

-- Add comments for documentation
COMMENT ON TABLE retrieval_logs IS 'Tracks RAG retrieval queries and performance metrics';
COMMENT ON TABLE index_jobs IS 'Queue for re-embedding and index maintenance jobs';
COMMENT ON TABLE nudges IS 'Email notifications and user follow-up scheduling';

COMMENT ON COLUMN retrieval_logs.score_mean IS 'Average similarity score of returned chunks (0-1)';
COMMENT ON COLUMN retrieval_logs.chunk_ids IS 'Array of chunk IDs returned by vector search';
COMMENT ON COLUMN retrieval_logs.outcome IS 'Query outcome: success, error, or hallucination_suspected';

COMMENT ON COLUMN index_jobs.payload IS 'Job configuration: metrics, hints, file lists, etc.';
COMMENT ON COLUMN index_jobs.reason IS 'Why job was created: low_score, hallucinations, manual';

COMMENT ON COLUMN nudges.payload IS 'Email template data: last_mood, suggestions, etc.';
COMMENT ON COLUMN nudges.scheduled_at IS 'When to send the notification';

-- Verify schema creation
DO $$
BEGIN
    RAISE NOTICE 'RAG Evaluation schema setup complete!';
    RAISE NOTICE 'Tables created: retrieval_logs, index_jobs, nudges';
    RAISE NOTICE 'Functions created: cleanup_old_retrieval_logs, get_retrieval_metrics, schedule_nudge';
    RAISE NOTICE 'Run SELECT * FROM get_retrieval_metrics() to test the setup';
END $$;