-- Fix profiles table schema to use UUID instead of TEXT
-- This is the cleanest long-term solution

-- Step 1: Check if user_id column is TEXT
DO $$
BEGIN
    -- Only proceed if user_id is currently TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
        AND table_schema = 'public'
    ) THEN
        -- Convert user_id from TEXT to UUID
        RAISE NOTICE 'Converting profiles.user_id from TEXT to UUID...';
        ALTER TABLE profiles 
        ALTER COLUMN user_id TYPE uuid 
        USING user_id::uuid;
        
        RAISE NOTICE '✅ profiles.user_id is now UUID type';
    ELSE
        RAISE NOTICE 'ℹ️  profiles.user_id is already UUID type or does not exist';
    END IF;
END $$;