const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

// HF inference API for judge model
async function queryHF(inputs, model = "microsoft/DialoGPT-medium") {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN || process.env.VITE_HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs }),
    }
  )
  return await response.json()
}

async function logEvalEvent(eventData) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('evaluation_events')
      .insert([{
        user_id: eventData.userId,
        session_id: eventData.sessionId,
        route_type: eventData.route,
        triage_label: eventData.triageLabel,
        is_crisis: eventData.isCrisis,
        outline_tokens: eventData.outlineTokens,
        reply_tokens: eventData.replyTokens,
        latency_ms: eventData.latencyMs,
        created_at: new Date().toISOString()
      }])
    
    if (error) throw error
    return { ok: true, data }
  } catch (e) {
    console.error('Failed to log evaluation event:', e)
    return { ok: false, error: e.message }
  }
}

async function runJudgeAndStore(judgeData) {
  try {
    const { userId, sessionId, message, reply, summary, longmem } = judgeData
    
    // Simple judge prompt
    const judgePrompt = `Rate this emotional support conversation on a scale of 1-5:
User: ${message}
Assistant: ${reply}

Consider: empathy, helpfulness, safety, boundaries.
Respond with just a number 1-5 and brief reason.`

    const judgeResult = await queryHF(judgePrompt, "microsoft/DialoGPT-medium")
    
    let score = 3 // default
    let reasoning = 'Auto-evaluation completed'
    
    if (judgeResult && judgeResult[0] && judgeResult[0].generated_text) {
      const judgeText = judgeResult[0].generated_text
      const scoreMatch = judgeText.match(/([1-5])/)
      if (scoreMatch) {
        score = parseInt(scoreMatch[1])
      }
      reasoning = judgeText.substring(0, 200) // truncate
    }

    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('evaluation_judgments')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        message_content: message.substring(0, 500),
        reply_content: reply.substring(0, 500),
        judge_score: score,
        judge_reasoning: reasoning,
        created_at: new Date().toISOString()
      }])

    if (error) throw error
    return { ok: true, score, reasoning }
  } catch (e) {
    console.error('Failed to run judge:', e)
    return { ok: false, error: e.message }
  }
}

module.exports = { logEvalEvent, runJudgeAndStore }