// 路由策略：是否需要推理、是否危机
// 与 index.js 对齐：导出 needsReasoning(text), isCrisis(triage)

const COMPLEX_RE = /(why|how|原因|怎么做|分析|复盘|计划|方案|pros|cons|break\s?down|step by step|reframe|模式|总结|综述)/i

function needsReasoning(userText = '') {
  const t = String(userText || '')
  // 规则：包含分析类词、或消息较长（>600 字符）、或包含“计划/步骤”
  if (COMPLEX_RE.test(t)) return true
  if (t.length > 600) return true
  if (/(计划|步骤|方案|trade[-\s]?offs?|优缺点|下一步)/i.test(t)) return true
  return false
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

export { needsReasoning, isCrisis }
