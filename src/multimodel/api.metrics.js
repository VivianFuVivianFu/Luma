const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

async function metricsSummary(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data } = await supa.rpc('metrics_summary_last24h')
    res.json(data || { ok: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

module.exports = { metricsSummary }