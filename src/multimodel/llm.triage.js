// HF Inference API：BERT triage（情绪/风险分类）
const cfg = require('./env.normalize.js')

async function triage(text) {
  if (!cfg.TRIAGE_API_URL || !cfg.HF_API_TOKEN) {
    throw new Error('Missing TRIAGE_API_URL or HF_API_TOKEN in .env')
  }
  const body = JSON.stringify({ inputs: text })

  // 简单退避重试：处理 503 冷启动
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(cfg.TRIAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body
    })
    if (r.status === 503) {
      await new Promise(res => setTimeout(res, 1200 * attempt))
      continue
    }
    if (!r.ok) throw new Error(`HF Inference API: ${r.status} ${await r.text()}`)
    const out = await r.json() // 形如 [{label, score}, ...]
    const arr = Array.isArray(out) ? out : [out]
    const top = arr.reduce((a, b) => (a.score || 0) > (b.score || 0) ? a : b, { score: -1 })

    const label = (top.label || 'unknown').toLowerCase()
    const risk = label === 'suicidal'
    // 兼容旧路由：给出 route/type/confidence
    const route = risk ? 'empathy' : (/(how|why|分析|怎么|计划|pros|cons)/i.test(text) ? 'reasoning' : 'empathy')

    return { label, score: top.score || 0, risk, raw: arr, type: label, route, confidence: top.score || 0 }
  }
  throw new Error('HF Inference API cold start timeout')
}

module.exports = { triage }
