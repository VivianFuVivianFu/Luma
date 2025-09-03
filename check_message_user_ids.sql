-- Check what user_id values are in the messages table
SELECT DISTINCT user_id, COUNT(*) as message_count
FROM messages 
GROUP BY user_id
ORDER BY message_count DESC
LIMIT 10;