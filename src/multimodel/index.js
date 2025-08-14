// 主路由：triage（HF）→ reasoning（Together 32B/70B）→ empathy（HF）+ 记忆
import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import cfg from './env.normalize.js'

import { triage } from './llm.triage.js'
import { empathyReply } from './llm.empathy.js'
import { reasonOutline32B, reasonOutline70B } from './llm.reason.together.js'
import { needsReasoning, isCrisis } from './router.policy.js'

// 优先用 supabase 版记忆，若不存在则退回 simple 版
import { loadContext, saveTurn, updateSummary, addLongMemories } from './memory.supabase.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/healthz', (_, res) => res.json({
  ok: true,
  model32: cfg.REASON_32B_MODEL,
  model70: cfg.REASON_70B_MODEL,
  empathy: cfg.HF_ENDPOINT_URL ? 'HF Endpoint' : 'HF Serverless',
}))

app.post('/api/chat', async (req, res) => {
  try {
    const { userId = 'u-demo', sessionId = 's-demo', message } = req.body || {}
    if (!message) return res.status(400).json({ error: 'message is required' })

    // 0) 记录用户消息
    await saveTurn(userId, { role: 'user', content: message, sessionId })

    // 1) triage
    const tri = await triage(message)
    const crisis = isCrisis(tri)
    const complex = crisis || needsReasoning(message)

    // 2) 记忆
    const { summary, longmem } = await loadContext(userId, sessionId)

    // 3) 推理
    let outline = ''
    if (complex) {
      outline = crisis
        ? await reasonOutline70B({ summary, longmem, user: message })
        : await reasonOutline32B({ summary, longmem, user: message })

      if (!crisis && (!outline || outline.length < 60)) {
        outline = await reasonOutline70B({ summary, longmem, user: message })
      }
    }

    // 4) Empathy 7B（统一语气）
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

Long-term info (for context):
${(longmem || []).map(s => '- ' + s).join('\n') || '(none)'}

(Internal outline from a reasoning assistant; do NOT reveal or mention it):
${outline || '(none)'}
`.trim()

    const reply = await empathyReply({ system, user: message })

    // 5) 写回
    await saveTurn(userId, { role: 'assistant', content: reply, sessionId })
    await updateSummary(userId, sessionId)

    const candidateMems = (outline || '')
      .split('\n')
      .map(s => s.replace(/^[\-\*\d\.\)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
    await addLongMemories(userId, candidateMems, sessionId)

    res.json({ reply, triage: tri, escalated: crisis || (outline && outline.length > 400) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Export MultiModelSystem class for use in the main app
export class MultiModelSystem {
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
      const complex = crisis || needsReasoning(userMessage);

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
export function startServer(port = cfg.PORT) {
  app.listen(port, () => {
    console.log(`Luma multimodel server on http://localhost:${port}`)
  })
}

