import { supabase } from './supabase'
import { fromB64u } from './b64'

// 사이트를 닫아도 오는 푸시 알림. 서버 함수(push)가 배포되어 있지 않으면 조용히 건너뜀.
export const pushSupported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isStandalone =
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)

let active = false
let lastError = ''
export const isPushActive = () => active
export const pushError = () => lastError

// 첫 방문 직후에는 서비스워커 등록이 끝나기 전일 수 있어 잠시 기다림
async function getRegistration(timeoutMs = 5000) {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing?.active) return existing
  return Promise.race([navigator.serviceWorker.ready, new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))])
}

export async function ensurePush() {
  lastError = ''
  if (!pushSupported) {
    lastError = '이 브라우저는 푸시 알림을 지원하지 않습니다.'
    return false
  }
  if (Notification.permission !== 'granted') {
    lastError = '브라우저 알림 권한이 허용되지 않았습니다.'
    return false
  }
  try {
    const reg = await getRegistration()
    if (!reg) {
      lastError = '서비스워커가 준비되지 않았습니다. 새로고침(F5) 후 다시 시도해 주세요.'
      return false
    }
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const { data, error } = await supabase.functions.invoke('push', { method: 'GET' })
      if (error || !data?.publicKey) {
        lastError = '알림 서버(push 함수)에 연결하지 못했습니다.'
        return false
      }
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(data.publicKey) })
    }
    const { endpoint, keys } = sub.toJSON()
    const { error } = await supabase.rpc('save_push_subscription', { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth })
    if (error) lastError = '알림 등록 정보를 서버에 저장하지 못했습니다.'
    active = !error
    return active
  } catch (err) {
    console.warn('push 구독 실패', err)
    lastError = `브라우저가 푸시 등록을 거부했습니다 (${err.name || err.message}). 회사 정책이나 네트워크에서 막혔을 수 있습니다.`
    return false
  }
}

// 서비스워커가 이 메시지 알림을 이미 띄웠는지
export async function pushShown(messageId) {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    return (await reg.getNotifications()).some((n) => n.data?.messageId === messageId)
  } catch {
    return false
  }
}

export function sendPush(messageId) {
  if (!messageId) return
  supabase.functions.invoke('push', { body: { message_id: messageId } }).catch(() => {})
}

// 알림 테스트 1: 서버를 거치지 않고 이 브라우저가 직접 알림을 띄움 (Windows 표시 여부 확인)
export async function showLocalTest() {
  const reg = pushSupported ? await getRegistration(2000) : null
  const options = { body: '이 알림이 보이면 Windows·브라우저 표시 설정은 정상입니다.', tag: 'local-test', icon: '/icon-192.png' }
  if (reg) return reg.showNotification('🔔 알림 테스트 (1단계)', options)
  new Notification('🔔 알림 테스트 (1단계)', options)
}

// 알림 테스트 2: 서버 → 푸시 서비스 → 이 기기 (사이트를 닫아도 오는 알림 경로)
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('push', { body: { test: true } })
  if (error) throw error
  return data
}
