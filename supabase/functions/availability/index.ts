import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const pepper = Deno.env.get('ACCOUNT_PEPPER');
const supabase = url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
const encoder = new TextEncoder();
const allowedSlots = Array.from({ length: 24 }, (_, index) => {
  const minutes = 10 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const eventYear = 2026;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-session-token', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
function hex(bytes: Uint8Array): string { return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function randomHex(length: number): string { return hex(crypto.getRandomValues(new Uint8Array(length))); }
async function sha256(value: string): Promise<string> { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256)));
}
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function todayInTaiwan(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
async function participantFromRequest(request: Request, required = false): Promise<string | null> {
  const token = request.headers.get('x-session-token');
  if (!token) { if (required) throw new HttpError(401, '請先登入。'); return null; }
  const tokenHash = await sha256(token);
  const { data, error } = await supabase!.from('sessions').select('participant_id,expires_at').eq('token_hash', tokenHash).maybeSingle();
  if (error) throw error;
  if (!data || Date.parse(data.expires_at) <= Date.now()) throw new HttpError(401, '登入已過期，請重新輸入代號與 PIN。');
  return data.participant_id;
}
async function snapshot(participantId: string | null) {
  const { data: counts, error: countsError } = await supabase!.rpc('slot_counts');
  if (countsError) throw countsError;
  let selections: Array<{ day: string; slot: string }> = [];
  if (participantId) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase!.from('availability').select('day,slot').eq('participant_id', participantId).gte('day', todayInTaiwan()).lte('day', `${eventYear}-12-14`).order('day').order('slot').range(offset, offset + 999);
      if (error) throw error;
      selections.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
  }
  return { counts: counts || [], selections };
}
async function login(body: Record<string, unknown>) {
  const accountName = String(body.accountName || '').trim().normalize('NFKC').toLocaleLowerCase('zh-TW');
  const pin = String(body.pin || '');
  if (!accountName || [...accountName].length > 40 || !/^\d{4}$/.test(pin)) {
    throw new HttpError(400, '代號不能空白且最多 40 個字；PIN 須為 4 位數字。');
  }
  const idHash = await sha256(`${pepper}:${accountName}`);
  const { data: existing, error: readError } = await supabase!.from('participants').select('id,pin_salt,pin_hash,failed_attempts,blocked_until').eq('account_hash', idHash).maybeSingle();
  if (readError) throw readError;
  let participantId: string;
  if (existing) {
    if (existing.blocked_until && Date.parse(existing.blocked_until) > Date.now()) throw new HttpError(429, '嘗試次數過多，請 15 分鐘後再試。');
    const candidate = await hashPin(pin, existing.pin_salt);
    if (!sameHash(candidate, existing.pin_hash)) {
      const failures = (existing.failed_attempts || 0) + 1;
      const blockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      const { error } = await supabase!.from('participants').update({ failed_attempts: failures >= 5 ? 0 : failures, blocked_until: blockedUntil }).eq('id', existing.id);
      if (error) throw error;
      throw new HttpError(401, '代號或 PIN 不正確。若忘記 PIN，請直接與老師聯繫。');
    }
    participantId = existing.id;
    const { error } = await supabase!.from('participants').update({ failed_attempts: 0, blocked_until: null }).eq('id', participantId);
    if (error) throw error;
  } else {
    const salt = randomHex(16);
    const { data, error } = await supabase!.from('participants').insert({ account_hash: idHash, pin_salt: salt, pin_hash: await hashPin(pin, salt) }).select('id').single();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, '此代號剛剛已建立，請再試一次。');
      throw error;
    }
    participantId = data.id;
  }
  const token = randomHex(32);
  const { error } = await supabase!.from('sessions').insert({ token_hash: await sha256(token), participant_id: participantId, expires_at: new Date(Date.now() + 90 * 86400000).toISOString() });
  if (error) throw error;
  return { token };
}
async function paint(request: Request, body: Record<string, unknown>) {
  const participantId = await participantFromRequest(request, true);
  const day = String(body.day || '');
  const from = allowedSlots.indexOf(String(body.from || ''));
  const to = allowedSlots.indexOf(String(body.to || ''));
  const today = todayInTaiwan();
  const end = `${eventYear}-12-14`;
  const parsedDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00Z`) : new Date(Number.NaN);
  const validDay = !Number.isNaN(parsedDay.getTime()) && parsedDay.toISOString().slice(0, 10) === day;
  if (!validDay || day < today || day > end || from < 0 || to < from || typeof body.selected !== 'boolean') {
    throw new HttpError(400, '日期或時間不在可選範圍內。');
  }
  const slots = allowedSlots.slice(from, to + 1);
  if (body.selected) {
    const rows = slots.map((slot) => ({ participant_id: participantId, day, slot }));
    const { error } = await supabase!.from('availability').upsert(rows, { onConflict: 'participant_id,day,slot' });
    if (error) throw error;
  } else {
    const { error } = await supabase!.from('availability').delete().eq('participant_id', participantId).eq('day', day).in('slot', slots);
    if (error) throw error;
  }
  return snapshot(participantId);
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: '不支援此操作。' }, 405);
  if (!supabase || !pepper) return json({ error: '伺服器尚未完成設定。' }, 503);
  try {
    const body = await request.json() as Record<string, unknown>;
    switch (body.action) {
      case 'snapshot': return json(await snapshot(await participantFromRequest(request)));
      case 'login': return json(await login(body));
      case 'paint': return json(await paint(request, body));
      case 'logout': {
        const token = request.headers.get('x-session-token');
        if (token) {
          const { error } = await supabase.from('sessions').delete().eq('token_hash', await sha256(token));
          if (error) throw error;
        }
        return json({ ok: true });
      }
      default: throw new HttpError(400, '不支援此操作。');
    }
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: '資料格式不正確。' }, 400);
    console.error(error);
    return json({ error: '暫時無法儲存，請稍後再試。' }, 500);
  }
});
