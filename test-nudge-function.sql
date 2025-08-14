-- 测试关怀邮件系统的 SQL 脚本
-- 在 Supabase SQL Editor 中运行此脚本来测试

-- 1. 查看候选用户
SELECT 
  user_id,
  last_complaint,
  summary,
  hours_inactive,
  'candidate' as status
FROM pick_users_for_nudge();

-- 2. 查看已发送的关怀邮件记录
SELECT 
  user_id,
  reason,
  email_sent,
  sent_at,
  date_trunc('week', sent_at) as week_of
FROM nudges 
WHERE email_sent = true 
ORDER BY sent_at DESC 
LIMIT 20;

-- 3. 查看本周发送统计
SELECT 
  date_trunc('week', sent_at) as week,
  count(*) as emails_sent,
  count(distinct user_id) as unique_users
FROM nudges 
WHERE email_sent = true 
  AND sent_at > date_trunc('week', now()) 
GROUP BY date_trunc('week', sent_at);

-- 4. 模拟添加测试用户（可选，用于测试）
-- 注意：只有在测试环境中才运行以下代码
-- INSERT INTO messages (session_id, user_id, role, content, created_at) VALUES 
-- ('test-session', gen_random_uuid(), 'user', 'I feel anxious and stressed', now() - interval '25 hours');

-- 5. 清理测试数据（如果需要）
-- DELETE FROM nudges WHERE reason LIKE 'test%';