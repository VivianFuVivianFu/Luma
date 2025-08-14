// Empathy Front — MentaLLaMA-7B（Endpoint 优先；否则 Serverless）
// ES module 版本；严禁硬编码 token
import cfg from './env.normalize.js'

function resolveUrl() {
  const url = cfg.HF_ENDPOINT_URL || cfg.EMPATHY_API_URL
  if (!url) throw new Error('Please set HF_ENDPOINT_URL (endpoint) or EMPATHY_API_URL (serverless) in .env')
  return url
}

async function empathyReply({ system, user }) {
  if (!cfg.HF_API_TOKEN) throw new Error('Missing HF_API_TOKEN in .env')
  const url = resolveUrl()
  const inputs = `System: ${system}\n\nUser: ${user}\nAssistant:`

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.HF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs,
      parameters: { max_new_tokens: cfg.EMPATHY_MAX_TOKENS, temperature: 0.7, top_p: 0.9, repetition_penalty: 1.05 }
    })
  })

  // HF Serverless 可能 503（冷启动）
  if (r.status === 503) {
    await new Promise(res => setTimeout(res, 1500))
    return empathyReply({ system, user })
  }
  if (!r.ok) throw new Error(`HF Empathy: ${r.status} ${await r.text()}`)

  const out = await r.json()
  const text = Array.isArray(out) ? (out[0]?.generated_text ?? '') : (out.generated_text ?? '')
  return text.split('Assistant:').pop()?.trim() || text.trim()
}

export { empathyReply }
