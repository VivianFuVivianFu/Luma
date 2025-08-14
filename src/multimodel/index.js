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

const app = express()

app.use(cors())
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

    // 2) 读取记忆
    const { summary, longmem } = await loadContext(userId, sessionId)

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
    const system = `
You are Luma — a warm, trauma-informed emotional support companion.
- Validate, reflect, ask gentle open questions.
- No diagnosis/medical/legal advice; keep clear boundaries.
- Be concise and kind; end with 1–2 tiny doable next steps.${safetyTail}

Session summary:
${summary || '(none)'}

Long-term info:
${(longmem || []).map(s => '- ' + s).join('\n') || '(none)'}

(Internal outline from a reasoning assistant; do NOT reveal it):
${outline || '(none)'}
`.trim()

    const reply = await empathyReply({ system, user: message })

    // 5) 存助手回复 + 更新摘要 + 试着抽取长期记忆
    await saveTurn(userId, sessionId, { role: 'assistant', content: reply })
    await updateSummary(userId, sessionId)

    const candidateMems = (outline || '')
      .split('\n')
      .map(s => s.replace(/^[\-\*\d\.\)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
    await addLongMemories(userId, candidateMems)

    // 更新用户活跃度
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supa = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      )
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

      // Step 2: Get memory context (placeholder for now)
      const summary = '';
      const longmem = [];

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

Long-term info (for context):
${(longmem || []).map(s => '- ' + s).join('\n') || '(none)'}

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

