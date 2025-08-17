// 主路由：triage（HF）→ reasoning（Together 32B/70B）→ empathy（HF）+ 记忆
const dotenv = require('dotenv')
dotenv.config()
const express = require('express')
const cors = require('cors')
const cfg = require('./env.normalize.js')

const { triage } = require('./llm.triage.js')
const { empathyReply } = require('./llm.empathy.js')
const { reasonOutline32B, reasonOutline70B } = require('./llm.reason.together.js')
const { needsReasoning, isCrisis } = require('./router.policy.js')

// 优先用 supabase 版记忆，若不存在则退回 simple 版
const { loadContext, saveTurn, updateSummary, addLongMemories } = require('./memory.supabase.js')
const { selectMemoriesForPrompt, bumpMemoryHit } = require('./memory.selector.js')

const app = express()

// Enhanced CORS configuration for better reliability
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000',
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.netlify\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json({ limit: '1mb' }))

// 添加反馈API（如果文件存在）
try {
  const { postFeedback } = require('./api.feedback')
  app.post('/api/feedback', postFeedback)
} catch (e) {
  // api.feedback 文件不存在时忽略
}

// 添加监控API
try {
  const { metricsSummary } = require('./api.metrics')
  app.get('/api/metrics', metricsSummary)
} catch (e) {
  console.log('api.metrics not available')
}

// 添加设备注册API
try {
  const { registerDevice, unregisterDevice, getUserDevices } = require('./api.devices')
  app.post('/api/devices/register', registerDevice)
  app.post('/api/devices/unregister', unregisterDevice)
  app.get('/api/devices/:userId', getUserDevices)
} catch (e) {
  console.log('api.devices not available')
}

// 添加定时任务管理API
try {
  const { startCron, stopCron, cronStatus, triggerNotifications, triggerCareNudges } = require('./cron.jobs')
  app.post('/api/cron/start', startCron)
  app.post('/api/cron/stop', stopCron)
  app.get('/api/cron/status', cronStatus)
  app.post('/api/cron/trigger/notifications', triggerNotifications)
  app.post('/api/cron/trigger/care-nudges', triggerCareNudges)
} catch (e) {
  console.log('cron.jobs not available:', e.message)
}

// 添加系统监控API
try {
  const {
    collectCapacityMetrics,
    getCapacityStatus,
    logPerformanceMetrics,
    getSystemHealth,
    checkCapacityAlerts,
    getRecentAlerts,
    resolveAlert,
    getCapacityTrends,
    getPerformanceTrends,
    updateSettings,
    getSettings
  } = require('./api.monitoring')
  
  // Capacity monitoring
  app.post('/api/monitoring/capacity/collect', collectCapacityMetrics)
  app.get('/api/monitoring/capacity/status', getCapacityStatus)
  app.get('/api/monitoring/capacity/trends', getCapacityTrends)
  app.post('/api/monitoring/capacity/check-alerts', checkCapacityAlerts)
  
  // Performance monitoring
  app.post('/api/monitoring/performance/log', logPerformanceMetrics)
  app.get('/api/monitoring/performance/trends', getPerformanceTrends)
  
  // System health
  app.get('/api/monitoring/health', getSystemHealth)
  
  // Alerts management
  app.get('/api/monitoring/alerts', getRecentAlerts)
  app.put('/api/monitoring/alerts/:alertId/resolve', resolveAlert)
  
  // Settings management
  app.get('/api/monitoring/settings', getSettings)
  app.put('/api/monitoring/settings', updateSettings)
  
  console.log('✅ Monitoring API endpoints loaded')
} catch (e) {
  console.log('⚠️  Monitoring API not available:', e.message)
}

// 添加记忆管理API
try {
  const {
    getUserMemories,
    getUserMemoryStats,
    scoreText,
    getAllMemoriesOverview,
    cleanupLowQualityMemories,
    addManualMemory
  } = require('./api.memory')
  
  // User memory endpoints
  app.get('/api/memory/users/:userId', getUserMemories)
  app.get('/api/memory/users/:userId/stats', getUserMemoryStats)
  
  // Memory analysis tools
  app.post('/api/memory/score', scoreText)
  app.post('/api/memory/add', addManualMemory)
  
  // Admin endpoints
  app.get('/api/memory/overview', getAllMemoriesOverview)
  app.post('/api/memory/cleanup', cleanupLowQualityMemories)
  
  console.log('✅ Memory Management API endpoints loaded')
} catch (e) {
  console.log('⚠️  Memory Management API not available:', e.message)
}

// 添加API保护和降级管理API
try {
  const {
    getGuardStatus,
    resetRoute,
    getReliabilityStats,
    getRecentIncidents,
    getHealthOverview,
    cleanupIncidents,
    simulateCall,
    getGuardConfig
  } = require('./api.guard')
  
  // Guard status and control
  app.get('/api/guard/status', getGuardStatus)
  app.get('/api/guard/config', getGuardConfig)
  app.get('/api/guard/health', getHealthOverview)
  app.post('/api/guard/routes/:route/reset', resetRoute)
  
  // API reliability monitoring
  app.get('/api/guard/reliability', getReliabilityStats)
  app.get('/api/guard/incidents', getRecentIncidents)
  app.post('/api/guard/incidents/cleanup', cleanupIncidents)
  
  // Testing endpoints
  app.post('/api/guard/simulate', simulateCall)
  
  console.log('✅ API Guard Management endpoints loaded')
} catch (e) {
  console.log('⚠️  API Guard Management not available:', e.message)
}

// 添加RAG评估和维护API
try {
  const {
    ragRetrieve,
    ragEval,
    ragJobsRun,
    ragStatus
  } = require('./api.rag')
  
  // RAG operations
  app.post('/api/rag/retrieve', ragRetrieve)
  app.get('/api/rag/status', ragStatus)
  
  // Admin-only endpoints
  app.post('/api/rag/eval', ragEval)
  app.post('/api/rag/jobs/run', ragJobsRun)
  
  console.log('✅ RAG Evaluation API endpoints loaded')
} catch (e) {
  console.log('⚠️  RAG Evaluation API not available:', e.message)
}

// 添加简单的记忆管理 API 端点
app.get('/api/memory/list', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const { getSupabaseClient } = require('../lib/supabaseClient.js');
    const supa = getSupabaseClient();
    const { data, error } = await supa
      .from('user_long_memory')
      .select('*')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 确认/编辑记忆（前端允许用户"确认为长期记忆"或提升重要性）
app.post('/api/memory/confirm', async (req, res) => {
  try {
    const { userId, hash, confirmed = true, importance } = req.body || {};
    if (!userId || !hash) return res.status(400).json({ error: 'userId & hash required' });
    const { getSupabaseClient } = require('../lib/supabaseClient.js');
    const supa = getSupabaseClient();
    const patch = { confirmed };
    if (typeof importance === 'number') patch.importance = Math.min(10, Math.max(1, Math.round(importance)));
    const { error } = await supa.from('user_long_memory').update(patch).match({ user_id: userId, hash });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除某条记忆
app.delete('/api/memory/:hash', async (req, res) => {
  try {
    const { userId } = req.query;
    const { hash } = req.params;
    if (!userId || !hash) return res.status(400).json({ error: 'userId & hash required' });
    const { getSupabaseClient } = require('../lib/supabaseClient.js');
    const supa = getSupabaseClient();
    const { error } = await supa.from('user_long_memory').delete().match({ user_id: userId, hash });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/healthz', (_, res) => res.json({
  ok: true,
  model32: cfg.REASON_32B_MODEL,
  model70: cfg.REASON_70B_MODEL,
  empathy: cfg.HF_ENDPOINT_URL ? 'HF Endpoint' : 'HF Serverless',
}))

app.post('/api/chat', async (req, res) => {
  const startTime = Date.now()
  try {
    // 前端依然传字符串 sessionId（可读），比如 "test-session"
    const { userId = 'u-demo', sessionId = 'test-session', message } = req.body || {}
    if (!message) return res.status(400).json({ error: 'message is required' })

    // 0) 记录用户消息（内部会自动把 sessionId 映射为 UUID）
    await saveTurn(userId, sessionId, { role: 'user', content: message })

    // 1) triage
    const tri = await triage(message)
    const crisis = isCrisis(tri)
    const complex = crisis || await needsReasoning(message)

    // 2) 读取记忆 - 使用新的智能选择器
    const { summary } = await loadContext(userId, sessionId)
    const topLtm = await selectMemoriesForPrompt(userId, 10)
    const longmem = topLtm.map(m => m.text) // 保持向后兼容性

    // 3) 推理（32B / 70B）
    let outline = ''
    if (complex) {
      if (crisis) {
        outline = await reasonOutline70B({ summary, longmem, user: message })
      } else {
        outline = await reasonOutline32B({ summary, longmem, user: message })
        if (!outline || outline.length < 60) {
          outline = await reasonOutline70B({ summary, longmem, user: message })
        }
      }
    }

    // 4) 同一语气由 7B 生成最终回复
    const safetyTail = crisis
      ? '\nIf you feel unsafe or at risk, please contact local crisis support immediately.'
      : ''
    // 使用智能选择的高质量长期记忆
    const longTermBullets = topLtm.map(m => m.bullet).join('\n') || '(none)'
    
    const system = `
You are Luma — a warm, trauma-informed emotional support companion.
- Validate, reflect, ask gentle open questions.
- No diagnosis/medical/legal advice; keep clear boundaries.
- Be concise and kind; end with 1–2 tiny doable next steps.${safetyTail}

Session summary:
${summary || '(none)'}

Key long-term facts about the user (for context):
${longTermBullets}

(Internal outline from a reasoning assistant; do NOT reveal it):
${outline || '(none)'}
`.trim()

    const reply = await empathyReply({ system, user: message })

    // 5) 存助手回复 + 更新摘要 + 智能抽取长期记忆
    await saveTurn(userId, sessionId, { role: 'assistant', content: reply })
    await updateSummary(userId, sessionId)

    // 使用智能记忆选择器替代原有的简单记忆存储
    try {
      const { maybeStoreLongMemories } = require('./memory.selector')
      
      // 提取候选记忆文本
      const candidateMems = []
      
      // 1. 从推理大纲中提取
      if (outline) {
        const outlineMemories = outline
          .split('\n')
          .map(s => s.replace(/^[\-\*\d\.\)]+\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 5) // 增加候选数量
        candidateMems.push(...outlineMemories)
      }
      
      // 2. 从用户消息中直接提取重要信息
      if (message && message.length > 20) {
        candidateMems.push(message)
      }
      
      // 3. 从AI回复中提取关键洞察
      if (reply && reply.length > 50) {
        // 提取AI回复中的关键建议和观察
        const sentences = reply.split(/[.!?。！？]/).filter(s => s.trim().length > 20)
        candidateMems.push(...sentences.slice(0, 2))
      }
      
      // 获取最近的对话轮次以改善重现分析
      const { loadRecentTurns } = require('./memory.supabase')
      const recentTurns = await loadRecentTurns(userId, sessionId, 10) || []
      
      // 智能存储长期记忆
      const memoryResult = await maybeStoreLongMemories(
        userId, 
        candidateMems, 
        recentTurns, 
        'conversation'
      )
      
      if (memoryResult.inserted > 0) {
        console.log(`[Chat] Stored ${memoryResult.inserted} new memories for user ${userId}`)
      }
    } catch (e) {
      console.error('[Chat] Error in smart memory storage:', e)
      // 降级到原有的简单存储方式
      const { addLongMemories } = require('./memory.supabase')
      const candidateMems = (outline || '')
        .split('\n')
        .map(s => s.replace(/^[\-\*\d\.\)]+\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      await addLongMemories(userId, candidateMems)
    }

    // 更新用户活跃度
    try {
      const { getSupabaseClient } = require('../lib/supabaseClient.ts')
      const supa = getSupabaseClient()
      await supa.rpc('update_user_activity', { p_user_id: userId, p_is_crisis: !!crisis })
    } catch (e) {
      // 用户活跃度更新失败不影响主流程
    }

    // 可选：记录评估事件（如果模块存在）
    try {
      const { logEvalEvent, runJudgeAndStore } = require('./metrics.evaluation')
      
      // 发送给用户后：记录一次事件
      await logEvalEvent({
        userId, sessionId,
        route: crisis ? 'reason70B->empathy' : (outline ? 'reason32B->empathy' : 'empathy'),
        triageLabel: tri?.label,
        isCrisis: !!crisis,
        outlineTokens: (outline || '').length,
        replyTokens: (reply || '').length,
        latencyMs: Date.now() - startTime
      })

      // 轻量 Judge（异步，不阻塞响应）
      runJudgeAndStore({
        userId, sessionId, message, reply, summary, longmem
      }).catch(()=>{})
    } catch (e) {
      // metrics.evaluation 模块不存在时忽略
    }

    res.json({
      reply,
      triage: tri,
      escalated: crisis || (outline && outline.length > 400),
      latencyMs: Date.now() - startTime
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Export MultiModelSystem class for use in the main app
class MultiModelSystem {
  constructor() {
    this.isInitialized = false;
    console.log('[MultiModel] System initialized');
  }

  async processMessage(userMessage, options = {}) {
    try {
      console.log(`[MultiModel] Processing: "${userMessage.substring(0, 50)}..."`);

      // Step 1: Triage the message
      const triageResult = await triage(userMessage);
      const crisis = isCrisis(triageResult);
      const complex = crisis || await needsReasoning(userMessage);

      // Step 2: Get memory context using smart selector
      const summary = '';
      const topLtm = await selectMemoriesForPrompt(options.userId || 'demo', 10);
      const longmem = topLtm.map(m => m.text);

      // Step 3: Generate reasoning if needed
      let outline = '';
      if (complex) {
        outline = crisis
          ? await reasonOutline70B({ summary, longmem, user: userMessage })
          : await reasonOutline32B({ summary, longmem, user: userMessage });

        if (!crisis && (!outline || outline.length < 60)) {
          outline = await reasonOutline70B({ summary, longmem, user: userMessage });
        }
      }

      // Step 4: Generate empathic response
      const safetyTail = crisis
        ? '\nIf you feel unsafe or at risk, please contact local crisis support immediately.'
        : '';

      const system = `
You are Luma — a warm, trauma-informed emotional support companion.
- Validate, reflect, ask gentle open questions.
- No diagnosis/medical/legal advice; keep clear boundaries.
- Be concise and kind; end with 1–2 tiny doable next steps.${safetyTail}

Session summary:
${summary || '(none)'}

Key long-term facts about the user (for context):
${topLtm.map(m => m.bullet).join('\n') || '(none)'}

(Internal outline from a reasoning assistant; do NOT reveal or mention it):
${outline || '(none)'}
`.trim();

      const reply = await empathyReply({ system, user: userMessage });

      return {
        response: reply,
        metadata: {
          model: crisis ? 'crisis' : (complex ? 'reasoning' : 'empathy'),
          confidence: triageResult.confidence || 0.8,
          triageType: triageResult.type,
          escalated: crisis || (outline && outline.length > 400)
        }
      };

    } catch (error) {
      console.error('[MultiModel] Error processing message:', error);
      return {
        response: "I'm here to listen and support you. Sometimes I have technical difficulties, but I care about what you're sharing with me. Can you tell me more about what's on your mind?",
        metadata: {
          model: 'fallback',
          confidence: 0.3,
          error: error.message
        }
      };
    }
  }

  getSystemMetrics() {
    return {
      system: {
        totalRequests: 0,
        successfulResponses: 0,
        averageResponseTime: 0
      }
    };
  }

  clearSystem() {
    console.log('[MultiModel] System cleared');
  }
}

// Optional: Export server functionality
function startServer(port = process.env.PORT || 8787) {
  app.listen(port, () => {
    console.log(`Luma multimodel server running on http://localhost:${port}`)
    
    // 自动启动定时任务调度器
    try {
      const { getCronScheduler } = require('./cron.jobs')
      const scheduler = getCronScheduler()
      scheduler.start()
      console.log('Notification scheduler started automatically')
    } catch (e) {
      console.log('Cron scheduler not available:', e.message)
    }
  })
}

module.exports = { MultiModelSystem, startServer }

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer()
}

