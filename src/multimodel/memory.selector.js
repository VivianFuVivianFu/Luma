// src/multimodel/memory.selector.js
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// ---- 可调参数（也可放 .env） ----
const LTM_THRESHOLD = Number(process.env.LUMA_LTM_THRESHOLD || 0.4); // 从 0.5 降到 0.4
const MAX_STORE_PER_TURN = Number(process.env.LUMA_LTM_MAX_STORE || 3);
const PROMPT_MAX_ITEMS = Number(process.env.LUMA_LTM_PROMPT_MAX || 10);
const PROMPT_MAX_CHARS = Number(process.env.LUMA_LTM_PROMPT_MAX_CHARS || 1500);

// 词库（中英混合，按需扩展）
const LEX = {
  emo: [
    // 中文情绪词（扩展版）
    '极度','非常','特别','崩溃','绝望','恐慌','害怕','难受','伤心','内疚','愤怒','羞耻',
    '失眠','噩梦','焦虑','恐惧','抑郁','痛苦','无助','孤独','烦躁','疲惫','沮丧','忧虑',
    '开心','兴奋','满足','感激','希望','乐观','平静','安心','愉快','轻松','舒畅','喜悦',
    '压力','困扰','担心','紧张','不安','恐慌','震惊','惊讶','愧疚','羞愧','自责','后悔',
    '愤怒','恼火','生气','暴躁','易怒','激动','冲动','急躁','不耐烦','厌倦','厌恶',
    // 英文情绪词
    'extremely', 'devastated', 'overwhelmed', 'anxious', 'depressed', 'panic', 'terrified', 
    'hopeless', 'grateful', 'excited', 'peaceful', 'stressed', 'worried', 'frustrated', 
    'exhausted', 'emotional', 'upset', 'angry', 'sad', 'happy', 'joyful', 'content'
  ],
  goals: [
    // 中文目标词（扩展版）
    '我要','打算','计划','每周','每天','目标','里程碑','坚持','练习','安排','制定',
    '想要','希望','决定','准备','开始','继续','改变','提升','改善','养成','建立',
    '锻炼','健身','运动','学习','工作','努力','奋斗','实现','达成','完成','坚持',
    '习惯','规律','定期','按时','准时','及时','持续','长期','短期','阶段性',
    // 英文目标词
    'I will','I plan','my goal','milestone','weekly','daily','habit','routine',
    'goal', 'plan', 'want to', 'going to', 'will', 'intend', 'aim', 'target',
    'exercise', 'workout', 'study', 'learn', 'improve', 'develop', 'build'
  ],
  identity: [
    // 中文身份词（扩展版）
    '我喜欢','我不喜欢','我讨厌','我倾向','习惯','偏好','价值观','边界','忌讳',
    '我是','我认为','对我来说','我的性格','我总是','我从不','我一直','我通常',
    '完美主义','性格','倾向于','特点','特质','品格','品性','个性','风格','方式',
    '我觉得','我感觉','我相信','我坚持','我认同','我反对','我支持','我拒绝',
    // 英文身份词
    'I like','I dislike','I prefer','boundary','value','trigger','I am','I believe',
    'I like', 'I hate', 'I prefer', 'I tend to', 'I always', 'I never', 
    'perfectionist', 'personality', 'character', 'trait', 'quality'
  ],
  steps: [
    // 中文行动词（扩展版）
    '第一步','第二步','小步骤','尝试','做法','练习','任务','提醒','下次','方法',
    '技巧','策略','步骤','过程','实施','执行','操作','行动','措施','手段',
    '深呼吸','冥想','放松','休息','学会','掌握','训练','锻炼','修炼','培养',
    // 英文行动词
    'step','try','exercise','practice','task','next time','method','technique',
    'first step', 'next step', 'try to', 'practice', 'method', 'strategy', 'approach',
    'breathing', 'meditation', 'relax', 'rest', 'technique', 'skill'
  ]
};

function hashText(text) {
  const norm = (text||'').toLowerCase().replace(/\s+/g,' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex');
}

function lengthDensityScore(text) {
  const t = (text||'').trim();
  if (!t) return 0;
  // 过短/过长惩罚；粗糙密度：非空字符 / 总字符
  const len = t.length;
  if (len < 12) return 0;        // 太短
  if (len > 240) return 0.1;     // 过长（提示应总结而不是整段收入）
  const dense = t.replace(/\s/g,'').length / len; // 0~1
  return Math.min(0.2, Math.max(0, dense * 0.2));
}

function scoreCandidate(text, recentTurns = [], nowTs = Date.now()) {
  const t = (text || '').toLowerCase();
  if (!t) return 0;

  let s = 0;
  const hit = (arr) => arr.some(k => t.includes(k));

  // 权重调整：提高目标/身份
  if (hit(LEX.emo))      s += 0.25; // 原 0.2 → 0.25
  if (hit(LEX.goals))    s += 0.35; // 原 0.2 → 0.35（大幅提升）
  if (hit(LEX.identity)) s += 0.30; // 原 0.2 → 0.30（大幅提升）
  if (hit(LEX.steps))    s += 0.20; // 不变

  // 复现频率：最近 N 轮触达 ≥2 次加分 0.2
  const tokens = t.replace(/[^\p{Letter}\p{Number}\s]/gu,' ').split(/\s+/).filter(w => w.length > 1);
  const bag = new Set(tokens);
  let hits = 0;
  for (const turn of (recentTurns||[])) {
    const u = (turn?.content||'').toLowerCase();
    if ([...bag].some(w => u.includes(w))) hits++;
  }
  if (hits >= 2) s += 0.2;
  else if (hits >= 1) s += 0.1;

  // 文本长度/密度加分（最多 0.2）
  s += lengthDensityScore(text);

  // 近期性微弱加分（最近 48h 的候选 +0.05）
  const lastTs = (recentTurns?.[recentTurns.length - 1]?.timestamp) || nowTs;
  const hours = (nowTs - lastTs) / (3600*1000);
  if (hours <= 48) s += 0.05;

  // 负面调整：过滤不重要的内容
  const trivialKeywords = [
    '谢谢', '再见', '你好', '嗯', '哦', '好的', '是的', '不是',
    'thank you', 'bye', 'hello', 'yes', 'no', 'ok', 'sure'
  ];
  if (trivialKeywords.some(keyword => t.includes(keyword)) && t.length < 30) {
    s *= 0.3; // 显著降低琐碎对话的分数
  }

  return Math.min(1, s);
}

async function maybeStoreLongMemories(userId, candidates = [], recentTurns = [], source='outline') {
  // 打分 + 排序 + 截断 + 去重写入
  const scored = candidates
    .map(raw => ({ raw: String(raw || '').trim() }))
    .filter(x => x.raw)
    .map(x => ({ ...x, score: scoreCandidate(x.raw, recentTurns) }))
    .filter(x => x.score >= LTM_THRESHOLD)
    .sort((a,b) => b.score - a.score)
    .slice(0, MAX_STORE_PER_TURN);

  if (!scored.length) {
    console.log(`[Memory] No memories met the importance threshold (${LTM_THRESHOLD})`);
    return { inserted: 0, kept: 0, threshold: LTM_THRESHOLD };
  }

  const rows = scored.map(x => ({
    user_id: userId,
    text: x.raw,
    importance: Math.max(1, Math.round(x.score * 10)), // 1..10
    hash: hashText(x.raw),
    source,
    confirmed: true
  }));

  try {
    const { data, error } = await supa
      .from('user_long_memory')
      .upsert(rows, { 
        onConflict: 'user_id,hash',
        ignoreDuplicates: true 
      })
      .select();

    if (error && !String(error?.message).includes('duplicate')) {
      throw error;
    }

    const inserted = data ? data.length : rows.length;
    console.log(`[Memory] Successfully stored ${inserted}/${rows.length} new memories for user ${userId}`);

    return { 
      inserted: inserted, 
      kept: scored.length, 
      threshold: LTM_THRESHOLD,
      processed: rows.length,
      filtered: candidates.length - rows.length,
      source: source
    };
  } catch (error) {
    console.error('[Memory] Error storing long memories:', error);
    throw error;
  }
}

// 给 Prompt 使用：选出"最相关 & 最重要"的记忆
async function selectMemoriesForPrompt(userId, limit = PROMPT_MAX_ITEMS) {
  try {
    // 规则：先按 importance desc；同分按最近命中时间；再按创建时间倒序
    const { data, error } = await supa
      .from('user_long_memory')
      .select('text, importance, hits, last_seen_at, created_at, hash')
      .eq('user_id', userId)
      .eq('confirmed', true)
      .order('importance', { ascending: false })
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit * 2); // 再做字符裁剪

    if (error) throw error;

    // 字符总长裁剪（保 PROMPT_MAX_CHARS 以内）
    const out = [];
    let total = 0;
    for (const r of (data || [])) {
      const segment = `- ${r.text}`;
      if (total + segment.length > PROMPT_MAX_CHARS) break;
      out.push({ ...r, bullet: segment });
      total += segment.length + 1;
      if (out.length >= limit) break;
    }
    return out;
  } catch (error) {
    console.error('[Memory] Error selecting memories for prompt:', error);
    return [];
  }
}

// 命中后记录一下（供你在生成后调用，提升后续排序）
async function bumpMemoryHit(userId, text) {
  try {
    const hash = hashText(text);
    await supa.rpc('ulm_bump', { p_user: userId, p_hash: hash });
  } catch (error) {
    console.error('[Memory] Error bumping memory hit:', error);
  }
}

/**
 * 获取用户的高质量长期记忆
 * @param {string} userId - 用户ID
 * @param {number} limit - 返回记忆的数量限制
 * @param {number} minImportance - 最低重要性分数
 * @returns {Promise<Array>} 长期记忆列表
 */
async function getHighQualityMemories(userId, limit = 10, minImportance = 6) {
  try {
    const { data, error } = await supa
      .from('user_long_memory')
      .select('text, importance, source, created_at')
      .eq('user_id', userId)
      .eq('confirmed', true)
      .gte('importance', minImportance)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Memory] Error fetching high quality memories:', error);
    return [];
  }
}

/**
 * 分析用户记忆的统计信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 统计信息
 */
async function analyzeMemoryStats(userId) {
  try {
    const { data, error } = await supa
      .from('user_long_memory')
      .select('importance, source, confirmed, created_at')
      .eq('user_id', userId);

    if (error) throw error;

    const memories = data || [];
    const stats = {
      total: memories.length,
      confirmed: memories.filter(m => m.confirmed).length,
      avgImportance: memories.length > 0 
        ? Math.round(memories.reduce((sum, m) => sum + m.importance, 0) / memories.length * 100) / 100
        : 0,
      sourceBreakdown: {},
      importanceDistribution: {
        low: memories.filter(m => m.importance < 4).length,
        medium: memories.filter(m => m.importance >= 4 && m.importance < 7).length,
        high: memories.filter(m => m.importance >= 7).length
      },
      recent30Days: memories.filter(m => 
        new Date(m.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    };

    // 统计来源分布
    memories.forEach(m => {
      stats.sourceBreakdown[m.source] = (stats.sourceBreakdown[m.source] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('[Memory] Error analyzing memory stats:', error);
    return null;
  }
}

module.exports = {
  maybeStoreLongMemories,
  selectMemoriesForPrompt,
  bumpMemoryHit,
  scoreCandidate,
  hashText,
  getHighQualityMemories,
  analyzeMemoryStats
};