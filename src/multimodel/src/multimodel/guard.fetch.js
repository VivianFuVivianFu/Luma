const fetch = (...a) => import('node-fetch').then(({default:f})=>f(...a));
const { createClient } = require('@supabase/supabase-js');

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// 事件落库
async function logIncident({ kind, detail, model, route }) {
  try {
    await supa.from('incidents').insert({ kind, detail: String(detail).slice(0,2000), model, route });
  } catch (e) { /* 忽略 */ }
}

// OneSignal 推送
async function notifyOps(title, message) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const key   = process.env.ONESIGNAL_REST_API_KEY;
  const admin = process.env.ADMIN_USER_ID || 'admin';
  if (!appId || !key) return;

  // 拉管理员设备
  const { data } = await supa.from('user_devices').select('player_id').eq('user_id', admin);
  const ids = (data||[]).map(d=>d.player_id).filter(Boolean);
  if (!ids.length) return;

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: ids,
      headings: { en: title, zh: title },
      contents: { en: message, zh: message }
    })
  });
}

// 包装器：超时、错误分类、自动降级回调
async function guardedModelCall({ route, model, request, timeoutMs=30000, onDegrade }) {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(request.url, { ...request, signal: ctrl.signal });
    clearTimeout(t);

    // 错误分类
    if (res.status === 401) {
      await logIncident({ kind: 'auth', model, route, detail: '401 unauthorized' });
      await notifyOps('Luma 模型鉴权失败', `${model} @ ${route} 返回 401`);
      if (onDegrade) return onDegrade('auth');
      throw new Error('auth failed');
    }
    if (res.status === 402) { // Together 配额不足常见
      await logIncident({ kind: 'quota', model, route, detail: '402 payment required / quota' });
      await notifyOps('Luma 配额不足', `${model} @ ${route} 额度不足/付费问题`);
      if (onDegrade) return onDegrade('quota');
      throw new Error('quota');
    }
    if (res.status === 429) {
      await logIncident({ kind: 'rate_limit', model, route, detail: '429 rate limited' });
      if (onDegrade) return onDegrade('rate_limit');
      throw new Error('rate limited');
    }
    if (res.status >= 500) {
      await logIncident({ kind: 'model_5xx', model, route, detail: `status ${res.status}` });
      if (onDegrade) return onDegrade('model_5xx');
      throw new Error('upstream 5xx');
    }

    const json = await res.json();
    return { ok: true, json, status: res.status };
  } catch (e) {
    clearTimeout(t);
    const isAbort = e.name === 'AbortError';
    if (isAbort) {
      await logIncident({ kind: 'timeout', model, route, detail: `> ${timeoutMs}ms` });
      await notifyOps('Luma 模型超时', `${model} @ ${route} 超过 ${timeoutMs}ms`);
      if (onDegrade) return onDegrade('timeout');
    } else {
      await logIncident({ kind: 'exception', model, route, detail: e.message });
      if (onDegrade) return onDegrade('exception');
    }
    return { ok: false, error: e };
  }
}

module.exports = { guardedModelCall, logIncident, notifyOps };
