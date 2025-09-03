-- Debug script to check your memory system data
-- Run this in Supabase SQL Editor to see what's stored

-- Check if you have any sessions
SELECT 'Sessions' as table_name, count(*) as count FROM public.sessions
UNION ALL
SELECT 'Messages' as table_name, count(*) as count FROM public.messages
UNION ALL
SELECT 'User Memories' as table_name, count(*) as count FROM public.user_memories
UNION ALL
SELECT 'Profiles' as table_name, count(*) as count FROM public.profiles;

-- Show recent sessions
SELECT 'Recent Sessions:' as info;
SELECT
  s.id,
  s.user_id,
  s.status,
  s.created_at,
  s.session_key,
  COUNT(m.id) as message_count
FROM public.sessions s
LEFT JOIN public.messages m ON s.id = m.session_id
GROUP BY s.id, s.user_id, s.status, s.created_at, s.session_key
ORDER BY s.created_at DESC
LIMIT 5;

-- Show recent messages
SELECT 'Recent Messages:' as info;
SELECT
  m.role,
  LEFT(m.content, 50) as content_preview,
  m.created_at
FROM public.messages m
ORDER BY m.created_at DESC
LIMIT 10;
