/**
 * Supabase 记忆版（与 memory.simple.js 完全同名导出）
 * 导出：
 *   loadContext(userId, sessionId)
 *   saveTurn(userId, { role, content, sessionId })
 *   updateSummary(userId, sessionId)
 *   addLongMemories(userId, bullets = [], sessionId)
 */
import dotenv from 'dotenv'
dotenv.config()
import { createClient } from '@supabase/supabase-js'

// 兼容你 .env 的 VITE_ 命名
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase env missing: VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// 表名允许通过 .env 覆盖
const TBL_MESSAGES  = process.env.SUPA_TBL_MESSAGES   || 'messages'
const TBL_SUMMARIES = process.env.SUPA_TBL_SUMMARIES  || 'session_summaries'
const TBL_LONGMEM   = process.env.SUPA_TBL_LONGMEM    || 'user_long_memory'

async function loadContext(userId, sessionId = 'default') {
  // 1) 摘要
  let summary = ''
  {
    const { data, error } = await supabase
      .from(TBL_SUMMARIES)
      .select('summary_text')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!error && data?.summary_text) summary = data.summary_text
  }

  // 2) 长期记忆 Top-K
  let longmem = []
  {
    const { data, error } = await supabase
      .rpc('fetch_long_memory_ranked', { p_user_id: userId, p_limit: 6 })
    if (!error && Array.isArray(data)) {
      longmem = data.map(r => r.text)
    } else {
      const { data: rows, error: e2 } = await supabase
        .from(TBL_LONGMEM)
        .select('text')
        .eq('user_id', userId)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)
      if (!e2 && Array.isArray(rows)) longmem = rows.map(r => r.text)
    }
  }
  return { summary, longmem }
}

async function saveTurn(userId, { role, content, sessionId = 'default' }) {
  const { error } = await supabase.from(TBL_MESSAGES).insert({
    user_id: userId, session_id: sessionId, role, content
  })
  if (error) throw error
}

async function updateSummary(userId, sessionId = 'default') {
  const { data: msgs, error: e1 } = await supabase
    .from(TBL_MESSAGES)
    .select('role, content, created_at')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (e1) throw e1

  const last12 = (msgs || []).slice(-12).map(m => `${m.role}: ${m.content}`).join('\n')
  const summary_text = last12.slice(-1200)

  const { error: e2 } = await supabase
    .from(TBL_SUMMARIES)
    .upsert(
      { user_id: userId, session_id: sessionId, summary_text },
      { onConflict: 'user_id,session_id' }
    )
  if (e2) throw e2
}

async function addLongMemories(userId, bullets = [], sessionId = 'default') {
  const rows = (bullets || [])
    .map(t => (t || '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(text => ({ user_id: userId, text, importance: 3 }))
  if (!rows.length) return
  const { error } = await supabase.from(TBL_LONGMEM).insert(rows)
  if (error) throw error
}

export { loadContext, saveTurn, updateSummary, addLongMemories }
