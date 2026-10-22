// =====================================================================
//  push - 새 메시지를 방 참여자들에게 푸시 알림으로 보냅니다.
//  외부 라이브러리 없이 Web Push 표준(RFC 8291 암호화, RFC 8292 VAPID)을 직접 구현했습니다.
//
//  GET              → { publicKey }  브라우저가 알림을 구독할 때 쓰는 공개키
//  POST {message_id} → 보낸 사람 본인이 호출. 방의 다른 참여자들에게 푸시 발송
//  POST {test: true} → 알림 테스트. 요청한 사람 본인의 기기로만 발송
//  POST {hook, text, ...} → 외부 사이트 연동 (예: 화이트보드 포스트잇). 연동 키로 확인
//
//  서명 키(VAPID)는 처음 호출될 때 자동으로 만들어 app_config 테이블에 저장합니다.
//  로그인 확인은 함수 안에서 직접 하므로, 대시보드의 "Verify JWT" 옵션은 꺼도 됩니다.
// =====================================================================

type Env = { url: string; key: string; subject: string }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const encoder = new TextEncoder()
const enc = (s: string) => encoder.encode(s)

export function b64u(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64u(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8))
}

// RFC 8291: 받는 브라우저의 공개키(p256dh)와 auth 비밀값으로 내용을 암호화 (aes128gcm)
export async function encryptPayload(payload: Uint8Array, p256dh: string, authSecret: string): Promise<Uint8Array> {
  const uaPublic = fromB64u(p256dh)
  const auth = fromB64u(authSecret)
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))

  const ikm = await hkdf(auth, shared, concat(enc('WebPush: info\u0000'), uaPublic, localPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\u0000'), 16)
  const nonce = await hkdf(salt, ikm, enc('Content-Encoding: nonce\u0000'), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(payload, new Uint8Array([2])))
  )

  const header = new Uint8Array(16 + 4 + 1 + localPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = localPublic.length
  header.set(localPublic, 21)
  return concat(header, cipher)
}

type Vapid = { publicKey: string; privateJwk: JsonWebKey }

// RFC 8292: 푸시 서버에 "이 사이트가 보낸 알림"임을 증명하는 서명
export async function vapidHeader(vapid: Vapid, endpoint: string, subject: string): Promise<string> {
  const header = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u(
    enc(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }))
  )
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc(`${header}.${claims}`)))
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${vapid.publicKey}`
}

async function db(env: Env, path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { apikey: env.key, 'Content-Type': 'application/json' }
  if (env.key.startsWith('eyJ')) headers.Authorization = `Bearer ${env.key}`
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...((init.headers as Record<string, string>) || {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`DB ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

let vapidCache: Vapid | null = null

async function getVapid(env: Env): Promise<Vapid> {
  if (vapidCache) return vapidCache
  const read = async () => {
    const rows = await db(env, 'app_config?key=eq.vapid&select=value')
    return rows.length ? (JSON.parse(rows[0].value) as Vapid) : null
  }
  let vapid = await read()
  if (!vapid) {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
    const publicKey = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)))
    const value = { publicKey, privateJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d } }
    // 동시에 여러 요청이 키를 만들어도 먼저 저장된 하나만 사용
    await db(env, 'app_config', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ key: 'vapid', value: JSON.stringify(value) }),
    })
    vapid = await read()
  }
  vapidCache = vapid
  return vapid!
}

async function getUserId(env: Env, authorization: string | null): Promise<string | null> {
  if (!authorization) return null
  const res = await fetch(`${env.url}/auth/v1/user`, { headers: { apikey: env.key, Authorization: authorization } })
  if (!res.ok) return null
  return (await res.json()).id ?? null
}

function preview(msg: Record<string, unknown>): string {
  if (msg.kind === 'image') return '사진'
  if (msg.kind === 'file') return `파일: ${msg.file_name}`
  if (msg.kind === 'report') return '📝 작업일보'
  if (msg.kind === 'bot') {
    const d = (msg.data || {}) as Record<string, string>
    return [d.title, d.text].filter(Boolean).join(' · ').slice(0, 120)
  }
  const body = String(msg.body ?? '')
  return body.length > 120 ? body.slice(0, 120) + '…' : body
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function sendForMessage(env: Env, userId: string, messageId: number) {
  const [msg] = await db(
    env,
    `messages?id=eq.${messageId}&select=id,room_id,user_id,kind,body,sender_name,is_urgent,mentions,file_name,deleted_at,pushed_at,created_at`
  )
  if (!msg || msg.user_id !== userId) return { status: 403, body: { error: 'NOT_ALLOWED' } }
  if (msg.pushed_at || msg.deleted_at || Date.now() - Date.parse(msg.created_at) > 10 * 60 * 1000) {
    return { status: 200, body: { sent: 0 } }
  }

  // 같은 메시지로 여러 번 보내지 못하도록 먼저 표시
  const claimed = await db(env, `messages?id=eq.${msg.id}&pushed_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ pushed_at: new Date().toISOString() }),
  })
  if (!claimed.length) return { status: 200, body: { sent: 0 } }

  return { status: 200, body: await notifyRoom(env, msg, userId) }
}

// 방 참여자들에게 메시지 알림 발송 (보낸 사람은 제외)
async function notifyRoom(env: Env, msg: Record<string, any>, excludeUserId: string | null) {
  const [room] = await db(env, `rooms?id=eq.${msg.room_id}&select=name`)
  const exclude = excludeUserId ? `&user_id=neq.${excludeUserId}` : ''
  const members = await db(env, `room_members?room_id=eq.${msg.room_id}${exclude}&select=user_id`)
  if (!members.length) return { sent: 0, total: 0 }
  const subs = await db(
    env,
    `push_subscriptions?user_id=in.(${members.map((m: { user_id: string }) => m.user_id).join(',')})&select=endpoint,user_id,p256dh,auth`
  )

  const vapid = await getVapid(env)
  const mentions: string[] = msg.mentions || []
  const results = await Promise.all(
    subs.map((sub: Subscription) => {
      const mentioned = mentions.includes(sub.user_id)
      const payload = {
        title: msg.is_urgent ? `🚨 [긴급] ${room.name}` : mentioned ? `${room.name} · @회원님` : msg.kind === 'bot' ? `📌 ${room.name}` : room.name,
        body: `${msg.sender_name}: ${preview(msg)}`,
        roomId: msg.room_id,
        messageId: msg.id,
        urgent: msg.is_urgent,
      }
      return pushTo(env, vapid, sub, payload, msg.is_urgent || mentioned)
    })
  )
  return { sent: results.filter((r) => r.ok).length, total: subs.length }
}

// ---------------------------------------------------------------------
// 외부 사이트 연동: 연동 키로 지정된 방에 📌 메시지를 넣고 알림 발송
//   POST { hook: '<연동 키>', title?, text, author?, url? }
// ---------------------------------------------------------------------

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc(text)))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

async function handleHook(env: Env, body: Record<string, unknown>) {
  const token = String(body.hook || '')
  if (!/^[0-9a-f]{48}$/.test(token)) return { status: 401, body: { error: 'INVALID_HOOK' } }
  const [integration] = await db(env, `integrations?token_hash=eq.${await sha256Hex(token)}&select=id,room_id,name`)
  if (!integration) return { status: 401, body: { error: 'INVALID_HOOK' } }

  const title = clip(body.title, 100)
  const text = clip(body.text, 1000)
  const author = clip(body.author, 50)
  const rawUrl = clip(body.url, 500)
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : ''
  if (!title && !text) return { status: 400, body: { error: 'EMPTY' } }

  // 같은 연동으로 1분에 30건까지 (잘못된 코드로 메시지가 쏟아지는 것 방지)
  const since = new Date(Date.now() - 60 * 1000).toISOString()
  const recent = await db(
    env,
    `messages?room_id=eq.${integration.room_id}&kind=eq.bot&data->>integration_id=eq.${integration.id}&created_at=gte.${since}&select=id&limit=30`
  )
  if (recent.length >= 30) return { status: 429, body: { error: 'TOO_MANY' } }

  const data = { integration_id: integration.id, source: integration.name, title, text, author, url }
  const [msg] = await db(env, 'messages', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      room_id: integration.room_id,
      user_id: null,
      kind: 'bot',
      sender_name: integration.name,
      body: [title, text, author && `- ${author}`].filter(Boolean).join('\n'),
      data,
    }),
  })
  await db(env, `integrations?id=eq.${integration.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  })
  const pushed = await notifyRoom(env, msg, null)
  return { status: 200, body: { ok: true, message_id: msg.id, ...pushed } }
}

// 알림 테스트: 요청한 사람 본인의 기기로만 발송하고, 기기별 결과를 돌려줌
async function sendTest(env: Env, userId: string) {
  const subs = await db(env, `push_subscriptions?user_id=eq.${userId}&select=endpoint,user_id,p256dh,auth`)
  const vapid = await getVapid(env)
  const payload = { title: '🔔 알림 테스트', body: '알림이 정상적으로 동작합니다. 이 창은 닫으셔도 됩니다.', test: true }
  const results = await Promise.all(subs.map((sub: Subscription) => pushTo(env, vapid, sub, payload, true)))
  return { total: subs.length, sent: results.filter((r) => r.ok).length, results }
}

type Subscription = { endpoint: string; user_id: string; p256dh: string; auth: string }

async function pushTo(env: Env, vapid: Vapid, sub: Subscription, payload: unknown, high: boolean) {
  const service = new URL(sub.endpoint).host
  try {
    const body = await encryptPayload(enc(JSON.stringify(payload)), sub.p256dh, sub.auth)
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        Urgency: high ? 'high' : 'normal',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Authorization: await vapidHeader(vapid, sub.endpoint, env.subject),
      },
      body,
    })
    // 브라우저에서 알림을 끄거나 삭제한 구독은 정리
    if (res.status === 404 || res.status === 410) {
      await db(env, `push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' })
    }
    const detail = res.ok ? '' : (await res.text()).slice(0, 200)
    if (!res.ok) console.error('push failed', service, res.status, detail)
    return { ok: res.ok, status: res.status, service, detail }
  } catch (err) {
    console.error('push error', service, err)
    return { ok: false, status: 0, service, detail: String(err).slice(0, 200) }
  }
}

export function createHandler(env: Env) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    try {
      if (req.method === 'GET') return json({ publicKey: (await getVapid(env)).publicKey })
      if (req.method !== 'POST') return json({ error: 'METHOD' }, 405)

      const body = await req.json().catch(() => ({}))
      if (body.hook) {
        const result = await handleHook(env, body)
        return json(result.body, result.status)
      }

      const userId = await getUserId(env, req.headers.get('Authorization'))
      if (!userId) return json({ error: 'NOT_SIGNED_IN' }, 401)
      const { message_id, test } = body
      if (test) return json(await sendTest(env, userId))
      const result = await sendForMessage(env, userId, Number(message_id))
      return json(result.body, result.status)
    } catch (err) {
      console.error(err)
      return json({ error: String(err) }, 500)
    }
  }
}

// deno-lint-ignore no-explicit-any
const Deno = (globalThis as any).Deno
if (Deno) {
  Deno.serve(
    createHandler({
      url: Deno.env.get('SUPABASE_URL')!,
      key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')!,
      subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    })
  )
}
