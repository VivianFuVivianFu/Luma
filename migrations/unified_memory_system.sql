-- =====================================================
-- UNIFIED MEMORY SYSTEM MIGRATION
-- Combines existing deployed schema with new enhancements
-- Safe for existing data, resolves all conflicts
-- =====================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. ENHANCE EXISTING SESSIONS TABLE
-- =====================================================

-- Add session_key column for human-readable session identifiers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'session_key'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN session_key TEXT;
        -- Create unique constraint on user_id + session_key combination
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_key ON public.sessions(user_id, session_key) 
        WHERE session_key IS NOT NULL;
    END IF;
END $$;

-- Add updated_at if missing (from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update using available timestamp columns in order of preference
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'ended_at' AND table_schema = 'public') THEN
            UPDATE public.sessions SET updated_at = ended_at WHERE updated_at IS NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'started_at' AND table_schema = 'public') THEN
            UPDATE public.sessions SET updated_at = started_at WHERE updated_at IS NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'created_at' AND table_schema = 'public') THEN
            UPDATE public.sessions SET updated_at = created_at WHERE updated_at IS NULL;
        ELSE
            -- Fallback to NOW() if no timestamp columns exist
            UPDATE public.sessions SET updated_at = NOW() WHERE updated_at IS NULL;
        END IF;
    END IF;
END $$;

-- Ensure sessions table has the correct structure
-- Rename started_at to created_at if needed for consistency
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'started_at'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sessions RENAME COLUMN started_at TO created_at;
    END IF;
END $$;

-- =====================================================
-- 2. ENHANCE SESSION SUMMARIES TABLE
-- =====================================================

-- Ensure session_summaries has consistent column names
DO $$ 
BEGIN
    -- If table has summary_text but not summary, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_summaries' AND column_name = 'summary_text'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_summaries' AND column_name = 'summary'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.session_summaries RENAME COLUMN summary_text TO summary;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_summaries' AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.session_summaries ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Rename updated_at from other schema if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_summaries' AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        -- Column already exists, good
        NULL;
    ELSE
        ALTER TABLE public.session_summaries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 3. CREATE UNIFIED USER MEMORIES TABLE
-- =====================================================

-- Create user_long_memory as an alias/view to existing user_memories
-- This resolves the naming conflict between user_memories and user_long_memory

DO $$ 
BEGIN
    -- If user_long_memory doesn't exist but user_memories does, create view
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_long_memory' AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_memories' AND table_schema = 'public'
    ) THEN
        -- Create a view that maps user_memories to user_long_memory structure
        CREATE VIEW public.user_long_memory AS
        SELECT 
            id,
            user_id,
            content as text,
            importance,
            created_at
        FROM public.user_memories;
    END IF;
END $$;

-- Ensure user_memories has importance column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memories' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_memories' AND column_name = 'importance'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.user_memories ADD COLUMN importance INTEGER DEFAULT 3;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 4. ENHANCED FUNCTIONS (UNIFIED VERSION)
-- =====================================================

-- Combined function that works with both session_key and direct UUID access
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_user_id UUID, 
    p_session_key TEXT DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
    v_session_id UUID;
BEGIN
    -- If session_key is provided, try to find existing session
    IF p_session_key IS NOT NULL THEN
        SELECT id INTO v_session_id 
        FROM public.sessions
        WHERE user_id = p_user_id AND session_key = p_session_key;
        
        -- If not found, create new session with session_key
        IF v_session_id IS NULL THEN
            INSERT INTO public.sessions(user_id, session_key, created_at, updated_at)
            VALUES (p_user_id, p_session_key, NOW(), NOW())
            RETURNING id INTO v_session_id;
        END IF;
    ELSE
        -- No session_key provided, find or create active session
        SELECT id INTO v_session_id 
        FROM public.sessions
        WHERE user_id = p_user_id 
          AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1;
        
        -- If no active session, create one
        IF v_session_id IS NULL THEN
            INSERT INTO public.sessions(user_id, status, created_at, updated_at)
            VALUES (p_user_id, 'active', NOW(), NOW())
            RETURNING id INTO v_session_id;
        END IF;
    END IF;
    
    RETURN v_session_id;
END;
$$;

-- Legacy compatibility function (TEXT user_id version)
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_user TEXT, 
    p_key TEXT
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
    v_session_id UUID;
BEGIN
    SELECT id INTO v_session_id 
    FROM public.sessions
    WHERE user_id = p_user::UUID AND session_key = p_key;
    
    IF v_session_id IS NULL THEN
        INSERT INTO public.sessions(user_id, session_key, created_at, updated_at)
        VALUES (p_user::UUID, p_key, NOW(), NOW())
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$;

-- Enhanced transcript function that works with session_key
CREATE OR REPLACE FUNCTION get_user_recent_transcript(
    target_user_id UUID, 
    hours_back INTEGER DEFAULT 24,
    session_key_filter TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  transcript TEXT;
BEGIN
  SELECT string_agg(
    CASE 
      WHEN role = 'user' THEN 'User: ' || content
      WHEN role = 'assistant' THEN 'Chatbot: ' || content
      WHEN role = 'system' THEN 'System: ' || content
    END, E'\n' ORDER BY m.created_at ASC
  ) INTO transcript
  FROM public.messages m
  LEFT JOIN public.sessions s ON m.session_id = s.id
  WHERE m.user_id = target_user_id 
    AND m.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    AND (session_key_filter IS NULL OR s.session_key = session_key_filter)
  LIMIT 20;
  
  RETURN COALESCE(transcript, 'No recent conversation found.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. UPDATE EXISTING TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update session timestamp function to work with unified schema
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers exist
DROP TRIGGER IF EXISTS trigger_update_session_timestamp ON public.messages;
CREATE TRIGGER trigger_update_session_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON public.sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_summaries_updated_at ON public.session_summaries;
CREATE TRIGGER update_session_summaries_updated_at 
  BEFORE UPDATE ON public.session_summaries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ENHANCED INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_session_time ON public.messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ulm_user_time ON public.user_memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON public.sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_summaries_updated ON public.session_summaries(updated_at DESC);

-- =====================================================
-- 7. UNIFIED VIEWS (UPDATED)
-- =====================================================

-- Enhanced user sessions view with session_key support
CREATE OR REPLACE VIEW user_sessions_view AS
SELECT 
  s.*,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM public.sessions s
LEFT JOIN public.messages m ON s.id = m.session_id
GROUP BY s.id, s.user_id, s.session_key, s.status, s.created_at, s.updated_at;

-- Enhanced session context view
CREATE OR REPLACE VIEW session_context_view AS
SELECT 
  s.id as session_id,
  s.user_id,
  s.session_key,
  ss.summary,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'role', m.role,
      'content', m.content,
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  ) FILTER (WHERE m.id IS NOT NULL) as recent_messages
FROM public.sessions s
LEFT JOIN public.session_summaries ss ON s.id = ss.session_id
LEFT JOIN (
  SELECT DISTINCT ON (session_id) session_id, id, role, content, created_at
  FROM public.messages 
  ORDER BY session_id, created_at DESC
) m ON s.id = m.session_id
GROUP BY s.id, s.user_id, s.session_key, ss.summary;

-- Active users view (compatible with both schemas)
CREATE OR REPLACE VIEW active_users_24h AS
SELECT DISTINCT
  m.user_id,
  p.display_name,
  NULL::text as avatar_url,
  NULL::text as device_token,
  true as daily_checkin_enabled,
  '18:00:00'::time as daily_checkin_time,
  'UTC'::text as timezone
FROM public.messages m
LEFT JOIN public.profiles p ON m.user_id = p.user_id
WHERE m.created_at >= NOW() - INTERVAL '24 hours';

-- =====================================================
-- 8. GRANT PERMISSIONS FOR SERVICE ROLE
-- =====================================================

-- Grant permissions for all tables and sequences
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.session_summaries TO service_role;
GRANT ALL ON public.user_memories TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_or_create_session(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_session(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_recent_transcript(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_session_timestamp() TO service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role;

-- =====================================================
-- 9. COMPATIBILITY LAYER
-- =====================================================

-- Function to migrate old session access patterns
CREATE OR REPLACE FUNCTION migrate_session_access()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    session_count INTEGER;
BEGIN
    -- Count sessions without session_key
    SELECT COUNT(*) INTO session_count 
    FROM public.sessions 
    WHERE session_key IS NULL;
    
    -- Update sessions without session_key to have a generated key
    UPDATE public.sessions 
    SET session_key = 'session-' || id::text
    WHERE session_key IS NULL;
    
    result_text := format('Updated %s sessions with generated session_key', session_count);
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION AND TESTING
-- =====================================================

DO $$
DECLARE
    result_text TEXT := '';
    test_user_id UUID := gen_random_uuid();
    test_session_id UUID;
BEGIN
    result_text := result_text || '========== UNIFIED SCHEMA VERIFICATION ==========' || E'\n';
    
    -- Test session creation with session_key
    test_session_id := get_or_create_session(test_user_id, 'test-session-' || extract(epoch from now())::text);
    result_text := result_text || '✅ Session creation with key: ' || test_session_id || E'\n';
    
    -- Test session creation without session_key
    test_session_id := get_or_create_session(test_user_id, NULL);
    result_text := result_text || '✅ Session creation without key: ' || test_session_id || E'\n';
    
    -- Check views exist
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_sessions_view') THEN
        result_text := result_text || '✅ user_sessions_view created' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'session_context_view') THEN
        result_text := result_text || '✅ session_context_view created' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_long_memory') THEN
        result_text := result_text || '✅ user_long_memory view created' || E'\n';
    END IF;
    
    -- Check functions exist
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_or_create_session') THEN
        result_text := result_text || '✅ get_or_create_session functions created' || E'\n';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.sessions WHERE user_id = test_user_id;
    
    result_text := result_text || '=================================================' || E'\n';
    result_text := result_text || 'UNIFIED MEMORY SYSTEM MIGRATION COMPLETE!' || E'\n';
    result_text := result_text || 'Both old and new access patterns are supported.' || E'\n';
    
    RAISE NOTICE '%', result_text;
END $$;