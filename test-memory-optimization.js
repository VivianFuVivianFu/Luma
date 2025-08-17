// 测试完整的记忆优化系统集成
const dotenv = require('dotenv');
dotenv.config();

async function testMemoryOptimization() {
  console.log('=== 测试记忆优化系统集成 ===');
  
  try {
    // 1. 测试智能记忆存储
    console.log('\n1. 测试智能记忆存储...');
    const { maybeStoreLongMemories, selectMemoriesForPrompt, bumpMemoryHit } = require('./src/multimodel/memory.selector');
    
    const testUserId = 'test-optimization-' + Date.now();
    const candidateMems = [
      '我感觉最近工作压力特别大，每天都很焦虑',
      '我计划每天早上锻炼30分钟来缓解压力',
      '我是一个完美主义者，总是对自己要求很高',
      '深呼吸练习对我很有效',
      '谢谢你的建议' // 这个应该被过滤掉（分数太低）
    ];
    
    const recentTurns = [
      { content: '我最近工作很忙', timestamp: Date.now() - 1000 * 60 * 60 },
      { content: '压力让我很难入睡', timestamp: Date.now() - 1000 * 60 * 30 }
    ];
    
    const result = await maybeStoreLongMemories(testUserId, candidateMems, recentTurns, 'test');
    console.log('存储结果:', result);
    
    // 2. 测试智能记忆选择
    console.log('\n2. 测试智能记忆选择...');
    const selectedMems = await selectMemoriesForPrompt(testUserId, 5);
    console.log('选中的记忆:', selectedMems.map(m => ({ text: m.text, importance: m.importance, bullet: m.bullet })));
    
    // 3. 测试记忆命中更新
    console.log('\n3. 测试记忆命中更新...');
    if (selectedMems.length > 0) {
      await bumpMemoryHit(testUserId, selectedMems[0].text);
      console.log('已更新记忆命中次数');
    }
    
    // 4. 测试API端点
    console.log('\n4. 测试记忆管理API...');
    
    // 直接测试数据库操作（模拟API功能）
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supa = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
                                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      
      // 测试获取记忆列表功能
      const { data, error } = await supa
        .from('user_long_memory')
        .select('*')
        .eq('user_id', testUserId)
        .order('importance', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      console.log(`记忆列表API功能测试: 返回 ${(data || []).length} 条记忆`);
      
      // 测试确认记忆功能
      if (data && data.length > 0) {
        const testMemory = data[0];
        const { error: updateError } = await supa
          .from('user_long_memory')
          .update({ importance: 9 })
          .match({ user_id: testUserId, hash: testMemory.hash });
        
        if (updateError) throw updateError;
        console.log('记忆确认API功能测试: 成功更新记忆重要性');
      }
      
    } catch (e) {
      console.log('API测试错误:', e.message);
    }
    
    // 5. 测试完整聊天流程中的记忆优化
    console.log('\n5. 测试完整聊天流程中的记忆优化...');
    const { saveTurn, loadContext } = require('./src/multimodel/memory.supabase');
    
    const sessionId = 'test-session-' + Date.now();
    
    // 模拟用户消息
    await saveTurn(testUserId, sessionId, { 
      role: 'user', 
      content: '我最近感觉很焦虑，工作压力让我睡不好觉，我想学一些放松技巧' 
    });
    
    // 模拟助手回复
    await saveTurn(testUserId, sessionId, { 
      role: 'assistant', 
      content: '我理解你的感受。深呼吸练习是很好的放松技巧，你可以试试每天花10分钟练习正念冥想。' 
    });
    
    // 加载上下文并验证记忆选择
    const { summary } = await loadContext(testUserId, sessionId);
    const contextMems = await selectMemoriesForPrompt(testUserId, 8);
    
    console.log('会话摘要:', summary || '(空)');
    console.log('上下文记忆数量:', contextMems.length);
    console.log('记忆内容预览:', contextMems.slice(0, 3).map(m => m.text.substring(0, 50) + '...'));
    
    // 6. 清理测试数据
    console.log('\n6. 清理测试数据...');
    const { createClient } = require('@supabase/supabase-js');
    const supaCleanup = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
                              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    await supaCleanup.from('user_long_memory').delete().eq('user_id', testUserId);
    await supaCleanup.from('user_sessions').delete().eq('user_id', testUserId);
    await supaCleanup.from('user_turns').delete().eq('user_id', testUserId);
    console.log('测试数据已清理');
    
    console.log('\n✅ 记忆优化系统集成测试完成');
    return true;
    
  } catch (error) {
    console.error('❌ 记忆优化测试失败:', error);
    console.error('错误详情:', error.stack);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testMemoryOptimization().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testMemoryOptimization };