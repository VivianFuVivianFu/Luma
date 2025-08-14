// Reasoning Sidekick：Together.ai（32B 常态 + 70B 升舱）
const cfg = require('./env.normalize.js')

async function togetherChat(model, messages, temperature = 0.3) {
  const r = await fetch(`${cfg.TOGETHER_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.TOGETHER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, max_tokens: cfg.REASON_MAX_TOKENS })
  })
  if (!r.ok) throw new Error(`${model}: ${r.status} ${await r.text()}`)
  const j = await r.json()
  return j.choices?.[0]?.message?.content?.trim() || ''
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
