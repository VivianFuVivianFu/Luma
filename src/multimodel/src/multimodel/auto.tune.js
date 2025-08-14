const { createClient } = require('@supabase/supabase-js')
const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

async function autoTuneThresholds() {
  const { data } = await supa
    .from('eval_events')
    .select('judge_helpfulness')
    .not('judge_helpfulness','is',null)
    .order('turn_ts', { ascending: false })
    .limit(500)
  if (!data?.length) return

  const avg = data.reduce((s,x)=>s+(x.judge_helpfulness||0),0)/data.length
  const { data: cur } = await supa.from('router_thresholds').select('*').eq('id',1).single()
  if (!cur) return
  let next = cur.min_length_for_reasoning
  if (avg < 0.55) next = Math.max(350, cur.min_length_for_reasoning - 100)
  if (avg > 0.70) next = Math.min(900, cur.min_length_for_reasoning + 100)

  // 24h 内只改一次
  const tooSoon = new Date(cur.updated_at) > new Date(Date.now() - 24*60*60*1000)
  if (next !== cur.min_length_for_reasoning && !tooSoon) {
    await supa.from('router_thresholds').update({
      min_length_for_reasoning: next, updated_at: new Date().toISOString()
    }).eq('id',1)
    console.log('[auto-tune] set min_length_for_reasoning =', next, 'avg helpfulness =', avg.toFixed(3))
  }
}
module.exports = { autoTuneThresholds }

