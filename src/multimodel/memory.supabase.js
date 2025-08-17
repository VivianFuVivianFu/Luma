// src/multimodel/memory.supabase.js
// 用 Supabase 存消息/摘要/长期记忆；把可读 sessionKey => UUID

const { createClient } = require('@supabase/supabase-js')

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  // 服务端要写库：优先用 Service Role Key；没配的话临时兼容 VITE_ 前缀
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

// 友好错误：表不存在时给出可读提示
function assertTableExistsError(e) {
  const msg = `${e?.message || e}`
  if (msg.includes("Could not find the table 'public.")) {
    throw new Error(
      msg +
      "  ← 数据库还没有对应的表。请到 Supabase SQL Editor 运行建表脚本（sessions/messages/session_summaries/user_long_memory + get_or_create_session）。"
    )
  }
  throw e
}

// 1) 把前端传的可读 sessionKey（如 "test-session"）映射到 UUID（sessions.id）
async function getSessionUUID(userId, sessionKey) {
  try {
    const { data, error } = await supa.rpc('get_or_create_session', {
      p_user: userId,
      p_key: sessionKey,
    })
    if (error) throw error
    return data // uuid 字符串
  } catch (e) {
    assertTableExistsError(e)
  }
}

// 2) 存一条消息
async function saveTurn(userId, sessionKey, { role, content }) {
  try {
    const sessionUUID = await getSessionUUID(userId, sessionKey)
    const { error } = await supa.from('messages').insert({
      user_id: userId,
      session_id: sessionUUID,   // 这里是 UUID！
      role,
      content
    })
    if (error) throw error
    return { sessionUUID }
  } catch (e) {
    assertTableExistsError(e)
  }
}

// 3) 读取会话上下文（最近摘要 + 一些长期记忆）
async function loadContext(userId, sessionKey) {
  try {
    const sessionUUID = await getSessionUUID(userId, sessionKey)

    const { data: sum, error: e1 } = await supa
      .from('session_summaries')
      .select('summary_text, updated_at')
      .eq('session_id', sessionUUID)
      .maybeSingle()
    if (e1) throw e1

    const { data: longmem, error: e2 } = await supa
      .from('user_long_memory')
      .select('text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    if (e2) throw e2

    return {
      sessionUUID,
      summary: sum?.summary_text || '',
      longmem: (longmem || []).map(r => r.text)
    }
  } catch (e) {
    assertTableExistsError(e)
  }
}

// 4) 更新摘要（示例：把最近 N 条串起来再存；你也可以换成更智能的总结）
async function updateSummary(userId, sessionKey, newSummaryText) {
  try {
    const sessionUUID = await getSessionUUID(userId, sessionKey)

    let summaryText = newSummaryText
    if (!summaryText) {
      const { data: msgs, error: e3 } = await supa
        .from('messages')
        .select('role, content')
        .eq('session_id', sessionUUID)
        .order('created_at', { ascending: false })
        .limit(8)
      if (e3) throw e3

      summaryText = (msgs || [])
        .reverse()
        .map(m => `${m.role === 'user' ? 'U' : 'A'}:${m.content}`)
        .join(' | ')
        .slice(0, 1000)
    }

    const { error } = await supa
      .from('session_summaries')
      .upsert({ session_id: sessionUUID, summary_text: summaryText, updated_at: new Date().toISOString() })
    if (error) throw error
  } catch (e) {
    assertTableExistsError(e)
  }
}

// 4.5) 加载最近的对话轮次，用于重现分析
async function loadRecentTurns(userId, sessionId, limit = 10) {
  try {
    const sessionUUID = await getOrCreateSessionUUID(userId, sessionId)
    
    const { data, error } = await supa
      .from('messages')
      .select('role, content, created_at')
      .eq('session_id', sessionUUID)
      .order('created_at', { ascending: false })
      .limit(limit * 2) // 获取更多数据以确保有足够的用户消息
    
    if (error) throw error
    
    // 只返回用户消息，用于重现分析
    return (data || [])
      .filter(msg => msg.role === 'user')
      .slice(0, limit)
      .reverse() // 按时间正序排列
  } catch (e) {
    console.error('[Memory] Error loading recent turns:', e)
    return []
  }
}

// 5) 添加入长期记忆（去重/过滤留给你后面优化）
async function addLongMemories(userId, items = []) {
  if (!items.length) return
  try {
    const rows = items.filter(Boolean).map(text => ({ user_id: userId, text }))
    const { error } = await supa.from('user_long_memory').insert(rows)
    if (error) throw error
  } catch (e) {
    assertTableExistsError(e)
  }
}

module.exports = {
  getSessionUUID,
  saveTurn,
  loadContext,
  updateSummary,
  addLongMemories,
  loadRecentTurns
}

