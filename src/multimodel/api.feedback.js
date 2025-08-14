const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

async function postFeedback(req, res) {
  try {
    const { userId, sessionId, rating, comment } = req.body
    
    if (!userId || !sessionId || rating === undefined) {
      return res.status(400).json({ error: 'userId, sessionId, and rating are required' })
    }

    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('feedbacks')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        rating: parseInt(rating),
        comment: comment || null,
        created_at: new Date().toISOString()
      }])

    if (error) throw error

    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

module.exports = { postFeedback }