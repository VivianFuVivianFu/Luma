-- Fix column name mismatch: section_key -> session_key
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sessions'
          AND column_name = 'section_key'
          AND table_schema = 'public'
    ) THEN
        -- Rename section_key to session_key
        ALTER TABLE public.sessions RENAME COLUMN section_key TO session_key;
        RAISE NOTICE '✅ Renamed section_key to session_key';
    ELSE
        RAISE NOTICE 'ℹ️ Column section_key does not exist, session_key already correct';
    END IF;
END $$;

-- Update the get_or_create_session function to use correct column name
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
      AND (p_session_key IS NULL OR session_key = p_session_key)
      AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1;

    -- If not found, create new session
    IF v_session_id IS NULL THEN
        INSERT INTO public.sessions(user_id, session_key, status, created_at, updated_at)
        VALUES (p_user_id, p_session_key, 'active', NOW(), NOW())
        RETURNING id INTO v_session_id;
    END IF;

    RETURN v_session_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_session(UUID, TEXT) TO service_role;
