-- Simple Memory System Fix - Works with your existing sessions table
-- Run this in Supabase SQL Editor

-- Add missing columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to session_summaries if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_summaries' AND column_name = 'created_at' AND table_schema = 'public') THEN
        ALTER TABLE public.session_summaries ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_summaries' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE public.session_summaries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add importance column to user_memories if missing
ALTER TABLE public.user_memories ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 3;

-- Create session management function
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
    -- Try to find existing session
    SELECT id INTO v_session_id 
    FROM public.sessions
    WHERE user_id = p_user_id 
      AND (p_session_key IS NULL OR section_key = p_session_key)
      AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- If not found, create new session
    IF v_session_id IS NULL THEN
        INSERT INTO public.sessions(user_id, section_key, status, created_at, updated_at)
        VALUES (p_user_id, p_session_key, 'active', NOW(), NOW())
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$;

-- Create helper function for transcripts
CREATE OR REPLACE FUNCTION get_user_recent_transcript(target_user_id UUID, hours_back INTEGER DEFAULT 24)
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
  LIMIT 20;
  
  RETURN COALESCE(transcript, 'No recent conversation found.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update triggers
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_timestamp ON public.messages;
CREATE TRIGGER trigger_update_session_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Grant permissions
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.session_summaries TO service_role;
GRANT ALL ON public.user_memories TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_session(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_recent_transcript(UUID, INTEGER) TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Memory system setup complete! Your sessions table structure: id, user_id, section_key, created_at, status, updated_at';
END $$;