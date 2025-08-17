// Reasoning Sidekick：Together.ai（32B 常态 + 70B 升舱）+ 智能降级保护
const cfg = require('./env.normalize.js')
const { guardedModelCall } = require('./guard.fetch')

async function togetherChat(model, messages, temperature = 0.3) {
  const route = model.includes('70') ? 'reason70B' : 'reason32B'
  const timeoutMs = model.includes('70') ? 45000 : 30000 // 70B模型需要更长时间
  
  try {
    const response = await guardedModelCall({
      route,
      model,
      timeoutMs,
      request: {
        url: `${cfg.TOGETHER_BASE}/chat/completions`,
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${cfg.TOGETHER_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          model, 
          messages, 
          temperature, 
          max_tokens: cfg.REASON_MAX_TOKENS 
        })
      },
      onDegrade: async (failureType, error) => {
        console.log(`[Reason] Degrading ${model} due to ${failureType}: ${error.message}`)
        
        // 降级策略1: 70B -> 32B
        if (model.includes('70')) {
          const fallbackModel = cfg.REASON_32B_MODEL
          console.log(`[Reason] Falling back from 70B to 32B model: ${fallbackModel}`)
          try {
            return await togetherChat(fallbackModel, messages, temperature)
          } catch (fallbackError) {
            console.warn('[Reason] 32B fallback also failed:', fallbackError.message)
            // 继续到下一个降级策略
          }
        }
        
        // 降级策略2: 返回简化版本让上层处理
        console.log('[Reason] All Together models failed, returning empty for empathy-only mode')
        return {
          ok: true,
          json: { 
            choices: [{ 
              message: { 
                content: '' // 空内容将触发上层的 empathy-only 模式
              } 
            }] 
          },
          degraded: true,
          degradationType: failureType
        }
      }
    })
    
    if (response.degraded) {
      // 如果是降级调用的结果，直接返回内容
      return response.json?.choices?.[0]?.message?.content?.trim() || ''
    }
    
    return response.json?.choices?.[0]?.message?.content?.trim() || ''
    
  } catch (error) {
    console.error(`[Reason] ${model} call failed completely:`, error.message)
    // 最终降级：返回空字符串，让上层走 empathy-only
    return ''
  }
}

const REASON_SYSTEM = `You are a careful counseling reasoner.
Return ONLY 3–6 bullet points:
- 1 line validating the user's feelings
- 1–2 key patterns or factors you infer
- 1–2 gentle cognitive reframes
- 1–2 small, doable next steps
No diagnosis/medical/legal advice. If crisis signals, add a one-line safety note.
Keep within ${cfg.REASON_MAX_TOKENS} tokens. Do NOT speak to the user directly.`

function buildUserContent(summary, longmem, userText) {
  const lm = (longmem || []).map(s => `- ${s}`).join('\n')
  return `Context summary:\n${summary || '(none)'}\n\nLong-term info:\n${lm || '(none)'}\n\nUser says:\n${userText}`
}

async function reasonOutline32B({ summary, longmem, user }) {
  const messages = [
    { role: 'system', content: REASON_SYSTEM },
    { role: 'user', content: buildUserContent(summary, longmem, user) }
  ]
  return togetherChat(cfg.REASON_32B_MODEL, messages, 0.3)
}

async function reasonOutline70B({ summary, longmem, user }) {
  const messages = [
    { role: 'system', content: REASON_SYSTEM },
    { role: 'user', content: buildUserContent(summary, longmem, user) }
  ]
  return togetherChat(cfg.REASON_70B_MODEL, messages, 0.2)
}

module.exports = { reasonOutline32B, reasonOutline70B }
