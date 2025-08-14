const { createClient } = require('@supabase/supabase-js')
const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

async function postFeedback(req, res) {
  try {
    const { userId, sessionId, thumb, empathy, helpfulness, safety, comment } = req.body || {}
    if (!userId || !sessionId || !thumb) return res.status(400).json({ error: 'missing fields' })
    const { error } = await supa.from('feedback').insert({
      user_id: userId, session_id: sessionId, thumb, empathy, helpfulness, safety, comment
    })
    if (error) throw error
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

module.exports = { postFeedback }

