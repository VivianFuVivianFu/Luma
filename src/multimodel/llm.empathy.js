// Empathy Front — MentaLLaMA-7B（Endpoint 优先；否则 Serverless）+ 智能降级保护
// CommonJS 版本；严禁硬编码 token
const cfg = require('./env.normalize.js')
const { guardedModelCall } = require('./guard.fetch')

function resolveUrl() {
  const url = cfg.HF_ENDPOINT_URL || cfg.EMPATHY_API_URL
  if (!url) throw new Error('Please set HF_ENDPOINT_URL (endpoint) or EMPATHY_API_URL (serverless) in .env')
  return url
}

// 温和的降级回复模板
const FALLBACK_RESPONSES = [
  "I hear you, and I want you to know that your feelings are completely valid. Sometimes technology has hiccups, but my care for you doesn't. Can you tell me a bit more about what's on your mind right now?",
  
  "Thank you for sharing with me. I'm experiencing some technical difficulties at the moment, but I'm still here to listen and support you. What's the most important thing you'd like to talk about today?",
  
  "I appreciate you opening up to me. While I work through some technical issues, please know that your wellbeing matters to me. Is there something specific that's been weighing on your heart lately?",
  
  "Your willingness to share means so much. I'm having some connectivity challenges right now, but I want to be present with you. What would be most helpful for you to explore together right now?",
  
  "I'm grateful you're here with me today. Although I'm experiencing some technical difficulties, my commitment to supporting you remains strong. What's been on your mind that you'd like to discuss?"
];

function getRandomFallbackResponse() {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

async function empathyReply({ system, user }) {
  if (!cfg.HF_API_TOKEN) throw new Error('Missing HF_API_TOKEN in .env')
  
  try {
    const url = resolveUrl()
    const inputs = `System: ${system}\n\nUser: ${user}\nAssistant:`
    
    const response = await guardedModelCall({
      route: 'empathy',
      model: 'MentaLLaMA-7B',
      timeoutMs: 25000, // 共情回复相对较快
      request: {
        url,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.HF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs,
          parameters: { 
            max_new_tokens: cfg.EMPATHY_MAX_TOKENS, 
            temperature: 0.7, 
            top_p: 0.9, 
            repetition_penalty: 1.05,
            return_full_text: false
          }
        })
      },
      onDegrade: async (failureType, error) => {
        console.log(`[Empathy] Degrading due to ${failureType}: ${error.message}`)
        
        // 对于共情回复，我们提供温暖的人工降级
        const fallbackResponse = getRandomFallbackResponse()
        
        // 根据失败类型调整回复
        let contextualResponse = fallbackResponse
        if (failureType === 'rate_limit') {
          contextualResponse += "\n\nI'm getting a lot of requests right now, which means many people are seeking support. You're not alone in this."
        } else if (failureType === 'timeout') {
          contextualResponse += "\n\nSometimes taking a moment to pause can be valuable too. What feels most present for you right now?"
        }
        
        return {
          ok: true,
          json: [{
            generated_text: contextualResponse
          }],
          degraded: true,
          degradationType: failureType
        }
      }
    })
    
    // 处理不同的响应格式
    let content = ''
    if (response.degraded) {
      content = response.json?.[0]?.generated_text || getRandomFallbackResponse()
    } else {
      // 处理HF的不同响应格式
      const data = response.json
      if (Array.isArray(data) && data[0]) {
        content = data[0].generated_text || data[0].text || ''
      } else if (data.generated_text) {
        content = data.generated_text
      } else if (typeof data === 'string') {
        content = data
      }
    }
    
    // 清理输出：移除系统提示重复
    content = content.replace(/^System:.*?Assistant:\s*/is, '').trim()
    
    // 确保至少有基本回复
    if (!content || content.length < 10) {
      console.warn('[Empathy] Received empty or very short response, using fallback')
      content = getRandomFallbackResponse()
    }
    
    return content
    
  } catch (error) {
    console.error('[Empathy] All empathy attempts failed:', error.message)
    
    // 最终安全网：总是提供温暖的回复
    const safetyResponse = getRandomFallbackResponse()
    console.log('[Empathy] Using safety fallback response')
    return safetyResponse
  }
}

module.exports = { empathyReply }
