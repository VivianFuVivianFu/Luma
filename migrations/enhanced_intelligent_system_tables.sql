-- =====================================================
-- ENHANCED INTELLIGENT SYSTEM DATABASE MIGRATIONS
-- Creates all required tables for the advanced AI systems
-- =====================================================

-- ========== USER ENGAGEMENT METRICS TABLE ==========
-- Tracks real-time user engagement patterns and behaviors
CREATE TABLE IF NOT EXISTS public.user_engagement_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    message_count INTEGER DEFAULT 0,
    avg_message_length DECIMAL(10,2) DEFAULT 0.0,
    response_time_avg DECIMAL(10,2) DEFAULT 0.0,
    emotional_intensity DECIMAL(3,2) DEFAULT 0.0,
    engagement_score DECIMAL(3,2) DEFAULT 0.0,
    breakthrough_indicators INTEGER DEFAULT 0,
    consistency_score DECIMAL(3,2) DEFAULT 0.0,
    interaction_depth TEXT DEFAULT 'surface', -- 'surface', 'moderate', 'deep', 'breakthrough'
    dominant_emotions TEXT[], -- array of detected emotions
    conversation_themes TEXT[], -- array of conversation themes
    user_preferences JSONB DEFAULT '{}',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== USER PREFERENCES TABLE ==========
-- Stores personalized user preferences and adaptation settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_response_style TEXT DEFAULT 'balanced', -- 'concise', 'detailed', 'balanced', 'encouraging'
    preferred_tone TEXT DEFAULT 'supportive', -- 'professional', 'casual', 'supportive', 'directive'
    communication_frequency TEXT DEFAULT 'adaptive', -- 'minimal', 'moderate', 'frequent', 'adaptive'
    session_length_preference TEXT DEFAULT 'medium', -- 'short', 'medium', 'long', 'flexible'
    emotional_support_level TEXT DEFAULT 'moderate', -- 'low', 'moderate', 'high', 'intensive'
    goal_focus_areas TEXT[] DEFAULT '{}', -- areas user wants to focus on
    trigger_topics TEXT[] DEFAULT '{}', -- sensitive topics to handle carefully
    preferred_times JSONB DEFAULT '{}', -- preferred interaction times
    privacy_level TEXT DEFAULT 'standard', -- 'minimal', 'standard', 'enhanced'
    personalization_enabled BOOLEAN DEFAULT true,
    memory_retention_days INTEGER DEFAULT 90,
    adaptive_learning_enabled BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== USER MEMORY CLUSTERS TABLE ==========
-- Stores semantic memory clusters for enhanced retrieval
CREATE TABLE IF NOT EXISTS public.user_memory_clusters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cluster_name TEXT NOT NULL,
    cluster_theme TEXT NOT NULL,
    memory_ids UUID[] NOT NULL, -- references to user_memories.id
    embedding_vector FLOAT8[], -- semantic embedding for the cluster
    importance_score DECIMAL(3,2) DEFAULT 0.0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_cluster_name CHECK (length(cluster_name) > 0),
    CONSTRAINT valid_cluster_theme CHECK (length(cluster_theme) > 0)
);

-- ========== MEMORY EXTRACTION JOBS TABLE ==========
-- Manages asynchronous memory extraction pipeline
CREATE TABLE IF NOT EXISTS public.memory_extraction_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    conversation_data JSONB NOT NULL,
    extracted_insights JSONB DEFAULT '{}',
    processing_metadata JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- ========== SYSTEM PERFORMANCE METRICS TABLE ==========
-- Tracks system performance and optimization metrics
CREATE TABLE IF NOT EXISTS public.system_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type TEXT NOT NULL, -- 'cache_performance', 'response_time', 'memory_retrieval', etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    metric_value DECIMAL(15,6) NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CREATE INDEXES ====================

-- User engagement metrics indexes
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON public.user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_session_id ON public.user_engagement_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_last_active ON public.user_engagement_metrics(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_score ON public.user_engagement_metrics(engagement_score DESC);

-- User preferences indexes  
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_style ON public.user_preferences(preferred_response_style);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated ON public.user_preferences(last_updated DESC);

-- User memory clusters indexes
CREATE INDEX IF NOT EXISTS idx_memory_clusters_user_id ON public.user_memory_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_clusters_theme ON public.user_memory_clusters(cluster_theme);
CREATE INDEX IF NOT EXISTS idx_memory_clusters_importance ON public.user_memory_clusters(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_clusters_accessed ON public.user_memory_clusters(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_memory_clusters_memory_ids ON public.user_memory_clusters USING gin(memory_ids);

-- Memory extraction jobs indexes
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_user_id ON public.memory_extraction_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON public.memory_extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_priority ON public.memory_extraction_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_created ON public.memory_extraction_jobs(created_at DESC);

-- System performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.system_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.system_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded ON public.system_performance_metrics(recorded_at DESC);

-- ==================== CREATE TRIGGERS ====================

-- User engagement metrics update trigger
CREATE OR REPLACE FUNCTION update_user_engagement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_engagement_updated_at ON public.user_engagement_metrics;
CREATE TRIGGER update_user_engagement_updated_at 
    BEFORE UPDATE ON public.user_engagement_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_engagement_updated_at();

-- User memory clusters update trigger
CREATE OR REPLACE FUNCTION update_memory_clusters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_memory_clusters_updated_at ON public.user_memory_clusters;
CREATE TRIGGER update_memory_clusters_updated_at 
    BEFORE UPDATE ON public.user_memory_clusters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_memory_clusters_updated_at();

-- ==================== GRANT PERMISSIONS ====================

GRANT ALL ON public.user_engagement_metrics TO service_role;
GRANT ALL ON public.user_preferences TO service_role;
GRANT ALL ON public.user_memory_clusters TO service_role;
GRANT ALL ON public.memory_extraction_jobs TO service_role;
GRANT ALL ON public.system_performance_metrics TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ==================== VERIFICATION ====================

DO $$
DECLARE
    result_text TEXT := '';
    table_count INTEGER;
BEGIN
    result_text := result_text || '========== ENHANCED SYSTEM TABLES VERIFICATION ==========' || E'\n';
    
    -- Check if all tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_engagement_metrics',
        'user_preferences', 
        'user_memory_clusters',
        'memory_extraction_jobs',
        'system_performance_metrics'
    );
    
    result_text := result_text || format('📊 Created %s enhanced system tables', table_count) || E'\n';
    
    -- Check user_engagement_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_engagement_metrics') THEN
        result_text := result_text || '✅ user_engagement_metrics table created' || E'\n';
    END IF;
    
    -- Check user_preferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        result_text := result_text || '✅ user_preferences table created' || E'\n';
    END IF;
    
    -- Check user_memory_clusters
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memory_clusters') THEN
        result_text := result_text || '✅ user_memory_clusters table created' || E'\n';
    END IF;
    
    -- Check memory_extraction_jobs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_extraction_jobs') THEN
        result_text := result_text || '✅ memory_extraction_jobs table created' || E'\n';
    END IF;
    
    -- Check system_performance_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_performance_metrics') THEN
        result_text := result_text || '✅ system_performance_metrics table created' || E'\n';
    END IF;
    
    result_text := result_text || '=========================================================' || E'\n';
    result_text := result_text || '🚀 ENHANCED INTELLIGENT SYSTEM TABLES SETUP COMPLETE!' || E'\n';
    result_text := result_text || '📋 Ready for memory-first architecture deployment' || E'\n';
    
    RAISE NOTICE '%', result_text;
END $$;