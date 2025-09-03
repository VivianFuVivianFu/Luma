-- Fix messages table user_id column to be UUID instead of TEXT
-- This will make it consistent with profiles table

DO $$
BEGIN
    -- Check if messages.user_id is currently TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Converting messages.user_id from TEXT to UUID...';
        
        -- Convert user_id column from TEXT to UUID
        ALTER TABLE messages 
        ALTER COLUMN user_id TYPE uuid 
        USING user_id::uuid;
        
        RAISE NOTICE '✅ messages.user_id is now UUID type';
    ELSE
        RAISE NOTICE 'ℹ️  messages.user_id is already UUID type or does not exist';
    END IF;
END $$;

-- Verify the change
SELECT 'messages.user_id data type after fix:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'user_id' 
AND table_schema = 'public';