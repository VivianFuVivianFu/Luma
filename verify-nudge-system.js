// 验证关怀邮件系统的 Node.js 脚本
// 在部署完成后运行此脚本来验证系统工作状态

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const FUNCTION_URL = `${SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')}/nudge-email-24h`;
const CRON_SECRET = process.env.CRON_SECRET;

console.log('🔍 验证 Luma 关怀邮件系统...\n');

async function verifyDatabase() {
  try {
    console.log('1️⃣ 检查数据库连接...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 检查 nudges 表是否存在
    const { data, error } = await supabase
      .from('nudges')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ 数据库表不存在或无权限:', error.message);
      console.log('📋 请确保已在 Supabase SQL Editor 中执行了 supabase_schema.sql');
      return false;
    }
    
    console.log('✅ 数据库连接正常');
    return true;
  } catch (e) {
    console.log('❌ 数据库连接失败:', e.message);
    return false;
  }
}

async function verifyFunction() {
  return new Promise((resolve) => {
    console.log('2️⃣ 检查 Edge Function...');
    
    const url = `${FUNCTION_URL}?token=${CRON_SECRET}`;
    console.log(`📡 测试 URL: ${url.replace(CRON_SECRET, '***')}`);
    
    const req = https.request(url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ Edge Function 工作正常');
          console.log(`📊 结果: ${JSON.stringify(result)}`);
          resolve(true);
        } else {
          console.log(`❌ Edge Function 返回错误 ${res.statusCode}:`, data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('❌ Edge Function 连接失败:', e.message);
      console.log('📋 请确保已部署函数: npx supabase functions deploy nudge-email-24h --no-verify-jwt');
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Edge Function 请求超时');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkCandidates() {
  try {
    console.log('3️⃣ 检查候选用户函数...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data, error } = await supabase.rpc('pick_users_for_nudge');
    
    if (error) {
      console.log('❌ 候选用户函数不存在:', error.message);
      return false;
    }
    
    console.log(`✅ 候选用户函数正常 (找到 ${data?.length || 0} 个候选用户)`);
    
    if (data && data.length > 0) {
      console.log('👥 候选用户样例:', data.slice(0, 2).map(u => ({
        user_id: u.user_id.substring(0, 8) + '...',
        hours_inactive: u.hours_inactive,
        has_concern: !!u.last_complaint
      })));
    }
    
    return true;
  } catch (e) {
    console.log('❌ 检查候选用户失败:', e.message);
    return false;
  }
}

async function verifySecrets() {
  console.log('4️⃣ 检查环境变量...');
  
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_SERVICE_ROLE_KEY', 
    'RESEND_API_KEY',
    'HF_API_TOKEN',
    'CRON_SECRET'
  ];
  
  let allPresent = true;
  for (const key of required) {
    if (process.env[key]) {
      console.log(`✅ ${key}: ${process.env[key].substring(0, 10)}...`);
    } else {
      console.log(`❌ 缺少环境变量: ${key}`);
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    console.log('📋 请检查 .env 文件或设置 Supabase secrets');
  }
  
  return allPresent;
}

async function main() {
  console.log(`🌐 项目 URL: ${SUPABASE_URL}`);
  console.log(`🔧 函数 URL: ${FUNCTION_URL}\n`);
  
  const results = await Promise.all([
    verifySecrets(),
    verifyDatabase(),
    verifyFunction(),
    checkCandidates()
  ]);
  
  const passed = results.filter(Boolean).length;
  console.log(`\n📈 验证结果: ${passed}/${results.length} 项通过`);
  
  if (passed === results.length) {
    console.log('🎉 系统配置完成！关怀邮件系统可以正常工作');
    console.log('⏰ 定时任务将在每天上午 10 点自动执行');
    console.log('📧 一周最多给每个用户发送一次关怀邮件');
  } else {
    console.log('⚠️  请根据上述错误信息完成剩余配置');
    console.log('📖 详细步骤请参考 deploy-nudge-system.md');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyDatabase, verifyFunction, checkCandidates };