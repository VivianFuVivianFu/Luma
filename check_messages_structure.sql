-- Check the messages table structure to see user_id data type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND table_schema = 'public'
AND column_name = 'user_id';
