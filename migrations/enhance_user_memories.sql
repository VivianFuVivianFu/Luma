-- =====================================================
-- ENHANCE USER MEMORIES TABLE FOR INTELLIGENT ORCHESTRATOR
-- Ensures compatibility with memory-first architecture
-- =====================================================

-- Create user_memories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'insight',
    theme TEXT,
    importance INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    session_context TEXT
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add session_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'session_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;
    END IF;

    -- Add type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN type TEXT NOT NULL DEFAULT 'insight';
    END IF;

    -- Add theme column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'theme'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN theme TEXT;
    END IF;

    -- Add importance column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'importance'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN importance INTEGER DEFAULT 3;
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add session_context column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        AND column_name = 'session_context'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_memories ADD COLUMN session_context TEXT;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_session_id ON public.user_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON public.user_memories(type);
CREATE INDEX IF NOT EXISTS idx_user_memories_theme ON public.user_memories(theme);
CREATE INDEX IF NOT EXISTS idx_user_memories_importance ON public.user_memories(importance);
CREATE INDEX IF NOT EXISTS idx_user_memories_created_at ON public.user_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_content_gin ON public.user_memories USING gin(to_tsvector('english', content));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_memories_updated_at ON public.user_memories;
CREATE TRIGGER update_user_memories_updated_at 
  BEFORE UPDATE ON public.user_memories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_memories_updated_at();

-- Grant permissions
GRANT ALL ON public.user_memories TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify table structure
DO $$
DECLARE
    result_text TEXT := '';
BEGIN
    result_text := result_text || '========== USER MEMORIES SCHEMA VERIFICATION ==========' || E'\n';
    
    -- Check required columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_memories' AND column_name = 'content') THEN
        result_text := result_text || '✅ content column exists' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_memories' AND column_name = 'type') THEN
        result_text := result_text || '✅ type column exists' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_memories' AND column_name = 'theme') THEN
        result_text := result_text || '✅ theme column exists' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_memories' AND column_name = 'session_id') THEN
        result_text := result_text || '✅ session_id column exists' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_memories' AND column_name = 'session_context') THEN
        result_text := result_text || '✅ session_context column exists' || E'\n';
    END IF;
    
    result_text := result_text || '=================================================' || E'\n';
    result_text := result_text || 'USER MEMORIES TABLE ENHANCEMENT COMPLETE!' || E'\n';
    
    RAISE NOTICE '%', result_text;
END $$;