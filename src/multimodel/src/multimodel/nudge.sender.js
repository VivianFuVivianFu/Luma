const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))
const { createClient } = require('@supabase/supabase-js')
const { empathyReply } = require('./llm.empathy')

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

async function pickUsersNeedingNudge() {
  // 过去72h 有负向情绪，过去24h 未活跃
  const { data } = await supa.rpc('pick_users_for_nudge').catch(()=>({ data: [] }))
  return data || []
}

async function composeNudge({ user_id, last_complaint, summary, longmem }) {
  const system = `
You are Luma. Write a very short, warm push notification (<= 160 chars).
- 1 sentence of validation + 1 tiny doable step.
- No diagnosis. Gentle tone, trauma-informed.
- If about sleep/anxiety, suggest a grounding/breathing micro-step.
- Use second person ("you").`
  const user = `Last topic: ${last_complaint}
Session summary: ${summary || '(none)'}
Long-term: ${(longmem||[]).join('; ') || '(none)'}
Now craft the notification:`
  const text = await empathyReply({ system, user })
  return text.replace(/\s+/g,' ').slice(0,160)
}

async function sendOneSignal({ playerIds, title, content }) {
  const appId = process.env.ONESIGNAL_APP_ID
  const key = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !key || !playerIds?.length) return

  await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: content }
    })
  })
}

async function runNudgeJob() {
  const users = await pickUsersNeedingNudge()
  for (const u of users) {
    // 拉设备
    const { data: devs } = await supa
      .from('user_devices').select('push_token,quiet_start,quiet_end')
      .eq('user_id', u.user_id)
    if (!devs?.length) continue
    // 简易静默判断（按用户本地时区可进一步扩展）
    const hour = new Date().getHours()
    const anyActive = devs.some(d => !(hour >= d.quiet_start || hour < d.quiet_end))
    if (!anyActive) continue

    const content = await composeNudge({
      user_id: u.user_id,
      last_complaint: u.last_complaint,
      summary: u.summary,
      longmem: u.longmem
    })
    await sendOneSignal({
      playerIds: devs.map(d => d.push_token),
      title: "Luma 小提醒",
      content
    })
    // 记账防重复
    await supa.from('nudges').insert({
      user_id: u.user_id, content, reason: 'recent_negative_no_activity'
    })
  }
}

module.exports = { runNudgeJob }
