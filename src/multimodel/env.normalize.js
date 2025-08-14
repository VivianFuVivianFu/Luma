// 统一 & 纠正环境变量，避免改你的 .env
const dotenv = require('dotenv')
dotenv.config()

function normQwen(name) {
  // 常见输入: "Qwen2.5 32B" / "Qwen2.5-32B" / "Qwen2.5-32B-Instruct"
  const raw = (name || '').trim()
  if (!raw) return 'Qwen2.5-32B-Instruct'
  if (/instruct/i.test(raw) && /32b/i.test(raw)) return raw
  if (/qwen2\.?5/i.test(raw) && /32b/i.test(raw)) return 'Qwen2.5-32B-Instruct'
  return 'Qwen2.5-32B-Instruct'
}

function normLlama(name) {
  // 如果不是 3.1 70B Instruct Turbo，就给默认
  const raw = (name || '').trim()
  if (/Meta-Llama-3\.1-70B-Instruct-Turbo/i.test(raw)) return raw
  return 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
}

const cfg = {
  PORT: process.env.PORT || 8787,

  // HF
  HF_API_TOKEN: process.env.HF_API_TOKEN || process.env.VITE_HF_API_TOKEN,
  TRIAGE_API_URL: process.env.TRIAGE_API_URL
    || 'https://api-inference.huggingface.co/models/Elite13/bert-finetuned-mental-health',

  // Empathy（二选一：Endpoint 优先，否则 Serverless）
  HF_ENDPOINT_URL: process.env.HF_ENDPOINT_URL || '',         // 你若有 Endpoint 就填这里
  EMPATHY_API_URL: process.env.EMPATHY_API_URL                // 没有 Endpoint 则用 serverless
    || 'https://api-inference.huggingface.co/models/klyang/MentaLLaMA-chat-7B',
  EMPATHY_MAX_TOKENS: parseInt(process.env.EMPATHY_MAX_TOKENS || '360', 10),

  // Together
  TOGETHER_BASE: process.env.TOGETHER_BASE || 'https://api.together.xyz/v1',
  TOGETHER_KEY: process.env.VITE_TOGETHER_API_KEY || process.env.TOGETHER_KEY,

  // 模型名（使用你的 VITE_*，必要时自动修正）
  REASON_32B_MODEL: normQwen(process.env.REASON_32B_MODEL || process.env.VITE_QWEN_MODEL),
  REASON_70B_MODEL: normLlama(process.env.REASON_70B_MODEL || process.env.VITE_LLAMA_MODEL),

  REASON_MAX_TOKENS: parseInt(process.env.REASON_MAX_TOKENS || '300', 10),
}

function assertRequired() {
  const missing = []
  if (!cfg.HF_API_TOKEN) missing.push('HF_API_TOKEN / VITE_HF_API_TOKEN')
  if (!cfg.TOGETHER_KEY) missing.push('VITE_TOGETHER_API_KEY / TOGETHER_KEY')
  if (missing.length) {
    console.warn('[env] Missing:', missing.join(', '))
  }
}

assertRequired()
module.exports = cfg
