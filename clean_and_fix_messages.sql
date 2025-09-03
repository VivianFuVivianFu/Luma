-- Clean up invalid user_ids and convert to UUID
-- This handles the test data and converts valid UUIDs

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- First, let's see what we're dealing with
    SELECT COUNT(*) INTO invalid_count
    FROM messages 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    
    RAISE NOTICE 'Found % messages with invalid UUID format', invalid_count;
    
    -- Option 1: Delete test/invalid messages (safest for production)
    DELETE FROM messages 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    
    RAISE NOTICE 'Deleted % invalid messages', invalid_count;
    
    -- Now convert the remaining valid user_ids to UUID
    ALTER TABLE messages 
    ALTER COLUMN user_id TYPE uuid 
    USING user_id::uuid;
    
    RAISE NOTICE '✅ Successfully converted messages.user_id to UUID';
    
    -- Show remaining message count
    SELECT COUNT(*) INTO invalid_count FROM messages;
    RAISE NOTICE 'Remaining messages: %', invalid_count;
    
END $$;