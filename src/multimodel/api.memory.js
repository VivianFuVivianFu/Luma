const { 
  getHighQualityMemories, 
  analyzeMemoryStats,
  scoreCandidate 
} = require('./memory.selector.js');

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );
}

// 获取用户的高质量记忆
async function getUserMemories(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 20, minImportance = 6 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }
    
    const memories = await getHighQualityMemories(
      userId, 
      parseInt(limit), 
      parseInt(minImportance)
    );
    
    res.json({
      success: true,
      memories,
      count: memories.length,
      filters: {
        minImportance: parseInt(minImportance),
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get user memories:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取用户记忆统计信息
async function getUserMemoryStats(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }
    
    const stats = await analyzeMemoryStats(userId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No memory data found for this user'
      });
    }
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get memory stats:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 评估文本的重要性分数（测试工具）
async function scoreText(req, res) {
  try {
    const { text, recentTexts = [] } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text parameter is required'
      });
    }
    
    // 模拟最近对话轮次格式
    const recentTurns = recentTexts.map(t => ({ content: t }));
    const score = scoreCandidate(text, recentTurns);
    
    res.json({
      success: true,
      text: text,
      score: Math.round(score * 1000) / 1000, // 3位小数
      importance: Math.round(score * 10), // 1-10分
      qualified: score >= 0.6, // 是否达到存储阈值
      analysis: {
        threshold: 0.6,
        recentTextsProvided: recentTexts.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to score text:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取所有用户的记忆概览（管理用）
async function getAllMemoriesOverview(req, res) {
  try {
    const { limit = 50 } = req.query;
    const supa = getSupabaseClient();
    
    // 获取每个用户的记忆统计
    const { data, error } = await supa
      .from('user_long_memory')
      .select(`
        user_id,
        importance,
        source,
        confirmed,
        created_at
      `)
      .eq('confirmed', true)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
      
    if (error) throw error;
    
    // 按用户分组统计
    const userStats = {};
    (data || []).forEach(memory => {
      const userId = memory.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          totalMemories: 0,
          avgImportance: 0,
          lastMemoryAt: null,
          sourceBreakdown: {},
          importanceDistribution: { low: 0, medium: 0, high: 0 }
        };
      }
      
      const stats = userStats[userId];
      stats.totalMemories++;
      stats.avgImportance = (stats.avgImportance * (stats.totalMemories - 1) + memory.importance) / stats.totalMemories;
      
      if (!stats.lastMemoryAt || memory.created_at > stats.lastMemoryAt) {
        stats.lastMemoryAt = memory.created_at;
      }
      
      stats.sourceBreakdown[memory.source] = (stats.sourceBreakdown[memory.source] || 0) + 1;
      
      if (memory.importance < 4) stats.importanceDistribution.low++;
      else if (memory.importance < 7) stats.importanceDistribution.medium++;
      else stats.importanceDistribution.high++;
    });
    
    // 转换为数组格式
    const overview = Object.entries(userStats).map(([userId, stats]) => ({
      userId,
      ...stats,
      avgImportance: Math.round(stats.avgImportance * 100) / 100
    }));
    
    res.json({
      success: true,
      overview,
      totalUsers: overview.length,
      totalMemories: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get memories overview:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 删除低质量记忆（清理工具）
async function cleanupLowQualityMemories(req, res) {
  try {
    const { maxImportance = 3, dryRun = true } = req.body;
    const supa = getSupabaseClient();
    
    if (dryRun) {
      // 只查询，不删除
      const { data, error } = await supa
        .from('user_long_memory')
        .select('id, user_id, text, importance, source')
        .lt('importance', maxImportance);
        
      if (error) throw error;
      
      res.json({
        success: true,
        dryRun: true,
        candidatesForDeletion: data?.length || 0,
        candidates: (data || []).map(m => ({
          id: m.id,
          userId: m.user_id,
          text: m.text.substring(0, 100) + '...',
          importance: m.importance,
          source: m.source
        })),
        message: 'This was a dry run. Set dryRun: false to actually delete.',
        timestamp: new Date().toISOString()
      });
    } else {
      // 实际删除
      const { data, error } = await supa
        .from('user_long_memory')
        .delete()
        .lt('importance', maxImportance)
        .select();
        
      if (error) throw error;
      
      res.json({
        success: true,
        dryRun: false,
        deleted: data?.length || 0,
        maxImportance,
        message: `Deleted ${data?.length || 0} low-quality memories`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('Failed to cleanup memories:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 手动添加高质量记忆
async function addManualMemory(req, res) {
  try {
    const { userId, text, importance = 8, source = 'manual' } = req.body;
    
    if (!userId || !text) {
      return res.status(400).json({
        success: false,
        error: 'userId and text are required'
      });
    }
    
    const { maybeStoreLongMemories } = require('./memory.selector');
    const result = await maybeStoreLongMemories(
      userId, 
      [text], 
      [], 
      source
    );
    
    res.json({
      success: true,
      result,
      memory: {
        userId,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        importance,
        source
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to add manual memory:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getUserMemories,
  getUserMemoryStats,
  scoreText,
  getAllMemoriesOverview,
  cleanupLowQualityMemories,
  addManualMemory
};