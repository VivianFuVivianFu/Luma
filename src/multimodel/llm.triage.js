// HF Inference API：BERT triage（情绪/风险分类）+ 智能降级保护
const cfg = require('./env.normalize.js')
const { guardedModelCall } = require('./guard.fetch')

// 默认的分类结果，用于降级时
const DEFAULT_TRIAGE_RESULT = {
  label: 'neutral',
  score: 0.5,
  confidence: 0.5,
  type: 'fallback'
}

// 基于关键词的简单情绪检测（降级策略）
function simpleEmotionDetection(text) {
  const lowerText = text.toLowerCase()
  
  // 危机关键词
  const crisisKeywords = ['自杀', '结束生命', 'kill myself', 'suicide', '想死', '不想活', '绝望']
  if (crisisKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      label: 'crisis',
      score: 0.9,
      confidence: 0.8,
      type: 'keyword_detection',
      detected_keywords: crisisKeywords.filter(k => lowerText.includes(k))
    }
  }
  
  // 负面情绪关键词
  const negativeKeywords = ['焦虑', '抑郁', '难过', '痛苦', 'anxious', 'depressed', 'sad', 'stressed']
  const negativeCount = negativeKeywords.filter(keyword => lowerText.includes(keyword)).length
  
  if (negativeCount >= 2) {
    return {
      label: 'negative',
      score: Math.min(0.8, 0.5 + negativeCount * 0.1),
      confidence: 0.7,
      type: 'keyword_detection'
    }
  } else if (negativeCount >= 1) {
    return {
      label: 'concerned',
      score: 0.6,
      confidence: 0.6,
      type: 'keyword_detection'
    }
  }
  
  // 正面情绪关键词
  const positiveKeywords = ['开心', '高兴', '快乐', 'happy', 'joyful', 'excited', 'grateful']
  if (positiveKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      label: 'positive',
      score: 0.7,
      confidence: 0.6,
      type: 'keyword_detection'
    }
  }
  
  return {
    label: 'neutral',
    score: 0.5,
    confidence: 0.5,
    type: 'keyword_detection_fallback'
  }
}

async function triage(text) {
  if (!cfg.TRIAGE_API_URL || !cfg.HF_API_TOKEN) {
    console.warn('[Triage] Missing API configuration, using keyword detection')
    return simpleEmotionDetection(text)
  }
  
  try {
    const response = await guardedModelCall({
      route: 'triage',
      model: 'BERT-sentiment',
      timeoutMs: 15000, // 分类相对较快
      request: {
        url: cfg.TRIAGE_API_URL,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.HF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
      },
      onDegrade: async (failureType, error) => {
        console.log(`[Triage] Degrading due to ${failureType}: ${error.message}`)
        
        // 降级到基于关键词的检测
        const keywordResult = simpleEmotionDetection(text)
        
        return {
          ok: true,
          json: [keywordResult],
          degraded: true,
          degradationType: failureType
        }
      }
    })
    
    if (response.degraded) {
      return response.json[0] || DEFAULT_TRIAGE_RESULT
    }
    
    // 处理HF分类结果
    const data = response.json
    if (Array.isArray(data) && data.length > 0) {
      // HF通常返回 [{ label: 'POSITIVE', score: 0.9 }, ...]
      const result = data[0]
      return {
        label: result.label?.toLowerCase() || 'neutral',
        score: result.score || 0.5,
        confidence: result.score || 0.5,
        type: 'hf_inference'
      }
    } else if (data.label) {
      return {
        label: data.label.toLowerCase(),
        score: data.score || 0.5,
        confidence: data.score || 0.5,
        type: 'hf_inference'
      }
    } else {
      console.warn('[Triage] Unexpected HF response format, using keyword detection')
      return simpleEmotionDetection(text)
    }
    
  } catch (error) {
    console.error('[Triage] All attempts failed, using keyword detection:', error.message)
    return simpleEmotionDetection(text)
  }
}

module.exports = { triage }
