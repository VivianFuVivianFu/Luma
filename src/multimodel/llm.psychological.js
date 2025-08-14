// Psychological Insight — Qwen3-psychological-reasoning-4B（Serverless）
// ES modules + env.normalize；不是主链必需，仅作「补充分析」
import cfg from './env.normalize.js'
const PSYCH_API_URL =
  process.env.PSYCH_API_URL ||
  'https://api-inference.huggingface.co/models/gustavecortal/Qwen3-psychological-reasoning-4B'

async function psychologicalInsight(userMessage, { summary = '', longmem = [] } = {}) {
  if (!cfg.HF_API_TOKEN) throw new Error('Missing HF_API_TOKEN in .env')
  const ctx = [
    'You are a psychological reasoning assistant. Give calm, evidence-informed insights.',
    summary ? `Context summary:\n${summary}` : '',
    longmem?.length ? `Long-term info:\n${longmem.map(s=>'- '+s).join('\n')}` : '',
    `Question:\n${userMessage}\nAnswer:`
  ].filter(Boolean).join('\n\n')

  const r = await fetch(PSYCH_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.HF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: ctx,
      parameters: { max_new_tokens: 300, temperature: 0.6, top_p: 0.85, repetition_penalty: 1.15 }
    })
  })
  if (r.status === 503) {
    await new Promise(res => setTimeout(res, 1500))
    return psychologicalInsight(userMessage, { summary, longmem })
  }
  if (!r.ok) throw new Error(`HF Psych: ${r.status} ${await r.text()}`)
  const out = await r.json()
  const text = Array.isArray(out) ? (out[0]?.generated_text ?? '') : (out.generated_text ?? '')
  return text.trim()
}

export { psychologicalInsight }
