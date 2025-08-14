const { createClient } = require('@supabase/supabase-js')
const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

let RT = { minLen: 600, kws: ['为什么','原因','分析','计划','步骤','优缺点','复盘','reframe'] }
let lastLoaded = 0

async function loadThresholdsIfNeeded() {
  const now = Date.now()
  if (now - lastLoaded < 5 * 60 * 1000) return // 5 分钟缓存
  const { data, error } = await supa.from('router_thresholds').select('*').eq('id',1).single()
  if (!error && data) {
    RT.minLen = data.min_length_for_reasoning ?? RT.minLen
    RT.kws = data.keywords ?? RT.kws
    lastLoaded = now
  }
}


// 路由策略：是否需要推理、是否危机
// 与 index.js 对齐：导出 needsReasoning(text), isCrisis(triage)

const COMPLEX_RE = /(why|how|原因|怎么做|分析|复盘|计划|方案|pros|cons|break\s?down|step by step|reframe|模式|总结|综述)/i

async function needsReasoning(userText = '') {
  await loadThresholdsIfNeeded()
  const t = String(userText || '')
  
  // 检查长度阈值
  if (t.length >= RT.minLen) return true
  
  // 检查关键词匹配
  const lc = t.toLowerCase()
  return RT.kws.some(k => lc.includes(k.toLowerCase()))
}

function isCrisis(triage) {
  // triage 来自 llm.triage.js：{ label, score, risk, ... }
  const label = (triage?.label || '').toLowerCase()
  if (label === 'suicidal') return true
  // 辅助阈值：当模型置信度很高且属于高风险大类时，提升警觉
  if ((triage?.score || 0) >= 0.9 && ['depression', 'anxiety', 'stress'].includes(label)) {
    return true
  }
  return false
}

module.exports = { needsReasoning, isCrisis }
