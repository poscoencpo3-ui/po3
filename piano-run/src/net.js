// 친구랑 경주: 같은 방 코드에 들어온 폰끼리 실시간으로 위치를 주고받음
// - Supabase 설정이 있으면 인터넷으로 (Realtime 채널)
// - 주소에 ?local=1 이면 같은 기기의 탭끼리 (테스트용)
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const online = Boolean(url && key)
export const supabase = online
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
export const localTest = new URLSearchParams(location.search).has('local')
export const canRace = online || localTest

export function newCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// 방장 = 가장 먼저 들어온 사람
export function hostOf(peers) {
  return [...peers].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))[0]
}

export function joinRoom(code, me, h) {
  return online && !localTest ? supabaseRoom(code, me, h) : localRoom(code, me, h)
}

function supabaseRoom(code, me, h) {
  let meta = { ...me, joinedAt: Date.now() }
  const ch = supabase.channel('piano-' + code, {
    config: { broadcast: { self: false }, presence: { key: me.id } },
  })
  ch.on('broadcast', { event: 'm' }, ({ payload }) => h.onMsg(payload.f, payload.t, payload.d))
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState()
    h.onPeers(Object.entries(st).map(([id, arr]) => ({ ...arr[arr.length - 1], id })))
  })
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track(meta)
    h.onStatus?.(status)
  })
  return {
    send: (t, d) => ch.send({ type: 'broadcast', event: 'm', payload: { f: me.id, t, d } }),
    update: (m) => {
      meta = { ...meta, ...m }
      ch.track(meta)
    },
    leave: () => supabase.removeChannel(ch),
  }
}

function localRoom(code, me, h) {
  const bc = new BroadcastChannel('piano-' + code)
  let meta = { ...me, joinedAt: Date.now() }
  const peers = new Map([[me.id, { ...meta, seen: Infinity }]])
  const emit = () => h.onPeers([...peers.values()].map(({ seen, ...p }) => p))
  const hello = () => bc.postMessage({ k: 'hello', meta })
  bc.onmessage = ({ data }) => {
    if (data.k === 'hello') {
      const isNew = !peers.has(data.meta.id)
      const old = peers.get(data.meta.id)
      peers.set(data.meta.id, { ...data.meta, seen: Date.now() })
      if (isNew) hello()
      if (isNew || JSON.stringify({ ...old, seen: 0 }) !== JSON.stringify({ ...data.meta, seen: 0 })) emit()
    } else if (data.k === 'bye') {
      peers.delete(data.id)
      emit()
    } else if (data.k === 'm') h.onMsg(data.f, data.t, data.d)
  }
  const timer = setInterval(() => {
    hello()
    let changed = false
    for (const [id, p] of peers) {
      if (Date.now() - p.seen > 3500) {
        peers.delete(id)
        changed = true
      }
    }
    if (changed) emit()
  }, 1000)
  hello()
  setTimeout(() => {
    h.onStatus?.('SUBSCRIBED')
    emit()
  }, 0)
  const bye = () => bc.postMessage({ k: 'bye', id: me.id })
  window.addEventListener('pagehide', bye)
  return {
    send: (t, d) => bc.postMessage({ k: 'm', f: me.id, t, d }),
    update: (m) => {
      meta = { ...meta, ...m }
      peers.set(me.id, { ...meta, seen: Infinity })
      hello()
      emit()
    },
    leave: () => {
      bye()
      clearInterval(timer)
      window.removeEventListener('pagehide', bye)
      bc.close()
    },
  }
}
