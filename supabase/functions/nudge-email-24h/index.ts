// Deno Edge Function: 定时触发 → 选人 → HF(MentalLLaMA-7B) 生成文案 → Resend 发信 → 记录 nudges
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")!; // e.g. "Luma <noreply@yourdomain.com>"
const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY")!;
const HF_MODEL_ID = Deno.env.get("HF_MODEL_ID") ?? "klyang/MentaLLaMA-chat-7B";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || ""; // 可选

async function sbRpc(fn: string, args?: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });
  if (!res.ok) throw new Error(`RPC ${fn} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function sbSelect(url: string) {
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`select failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function insertNudge(row: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/nudges`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert nudges failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

// 先从 profiles 拿邮箱，拿不到再从 auth.admin 查
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const data = await sbSelect(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=email&limit=1`);
    if (Array.isArray(data) && data[0]?.email) return data[0].email;
  } catch { /* ignore */ }

  // admin users
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?id=${userId}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (res.ok) {
    const u = await res.json();
    if (u?.user?.email) return u.user.email;
  }
  return null;
}

function buildPrompt(input: { last?: string; summary?: string; longmem?: string[]; hoursInactive?: number }) {
  const lm = (input.longmem ?? []).slice(0, 3).map(s => `- ${s}`).join("\n");
  const timeMsg = input.hoursInactive ? 
    (input.hoursInactive > 48 ? 
      `haven't heard from you in ${Math.round(input.hoursInactive / 24)} days` : 
      `haven't heard from you in ${input.hoursInactive} hours`) : 
    "haven't heard from you for a while";
    
  return `
You are "Luma", a warm, caring mental wellness companion.
Write a gentle, non-intrusive check-in email (100-180 words) in friendly English.
Be supportive but respectful - the user ${timeMsg}.
Avoid being pushy. Include ONE simple, comforting suggestion.
End with "Take care, — Luma 💙"

Context:
- Previous concern: ${input.last ?? "(none shared)"} 
- Session notes: ${input.summary ?? "(none)"} 
- Long-term context:
${lm || "- (none)"} 

Keep it warm, brief, and caring. Plain text only.
`.trim();
}

async function runHF(prompt: string): Promise<string> {
  const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL_ID}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 260, temperature: 0.7, top_p: 0.9, do_sample: true },
      options: { wait_for_model: true }
    }),
  });
  if (!res.ok) throw new Error(`HF error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) return String(data[0].generated_text);
  if (typeof data === "object" && data.generated_text) return String((data as any).generated_text);
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend failed ${res.status}: ${await res.text()}`);
  return await res.json();
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    // 可选：简单令牌校验，防止被外部乱触发
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (CRON_SECRET && token !== CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 1) 取候选用户
    const picks = await sbRpc("pick_users_for_nudge");
    if (!Array.isArray(picks) || picks.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
    }

    let sent = 0;
    for (const p of picks) {
      const uid = String(p.user_id);
      const email = await getUserEmail(uid);
      if (!email) continue;

      // 2) 生成邮件文案
      const prompt = buildPrompt({
        last: p.last_complaint ?? "",
        summary: p.summary ?? "",
        longmem: p.longmem ?? [],
        hoursInactive: p.hours_inactive ?? 24,
      });
      let text = await runHF(prompt);
      if (text.includes("Context:")) text = text.split("Context:")[0].trim();

      // 3) 发邮件 - 更温和的主题
      const subjectLine = p.hours_inactive > 72 ? 
        "Thinking of you 💙" : 
        "Just checking in — from Luma";
      
      await sendEmail(email, subjectLine, text);

      // 4) 回写记录 - 标记为已发送邮件
      await insertNudge({
        user_id: uid,
        reason: `inactive_${p.hours_inactive}h_with_concern`,
        model_input: { prompt, hours_inactive: p.hours_inactive },
        model_output: { text },
        email_sent: true,
        sent_at: new Date().toISOString(),
      });

      sent += 1;
      
      // 5) 添加延迟，避免发送过快
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒延迟
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});