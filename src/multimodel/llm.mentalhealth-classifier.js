// Mental Health Classifier（封装 triage 的统一输出）— ES modules 版本
import cfg from './env.normalize.js'

async function classifyMentalHealth(text) {
  const r = await fetch(cfg.TRIAGE_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.HF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text })
  })
  if (r.status === 503) {
    await new Promise(res => setTimeout(res, 1200))
    return classifyMentalHealth(text)
  }
  if (!r.ok) throw new Error(`HF Inference API: ${r.status} ${await r.text()}`)
  const out = await r.json()
  const arr = Array.isArray(out) ? out : [out]
  arr.sort((a,b)=> (b.score||0)-(a.score||0))
  const top = arr[0] || {}
  return {
    primaryCondition: (top.label || 'unknown').toLowerCase(),
    confidence: top.score || 0,
    allResults: arr,
    risk: (top.label || '').toLowerCase() === 'suicidal'
  }
}

export { classifyMentalHealth }
