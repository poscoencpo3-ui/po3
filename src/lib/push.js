import { supabase } from './supabase'
import { fromB64u } from './b64'

// 사이트를 닫아도 오는 푸시 알림. 서버 함수(push)가 배포되어 있지 않으면 조용히 건너뜀.
export const pushSupported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isStandalone =
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)

let active = false
export const isPushActive = () => active

export async function ensurePush() {
  if (!pushSupported || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const { data, error } = await supabase.functions.invoke('push', { method: 'GET' })
      if (error || !data?.publicKey) return false
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(data.publicKey) })
    }
    const { endpoint, keys } = sub.toJSON()
    const { error } = await supabase.rpc('save_push_subscription', { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth })
    active = !error
    return active
  } catch (err) {
    console.warn('push 구독 실패', err)
    return false
  }
}

export function sendPush(messageId) {
  if (!messageId) return
  supabase.functions.invoke('push', { body: { message_id: messageId } }).catch(() => {})
}
