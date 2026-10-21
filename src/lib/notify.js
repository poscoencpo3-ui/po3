import { APP_NAME } from './supabase'

export const notifySupported = typeof window !== 'undefined' && 'Notification' in window

export function notifyPermission() {
  return notifySupported ? Notification.permission : 'unsupported'
}

export async function requestNotifyPermission() {
  if (!notifySupported) return 'unsupported'
  return Notification.requestPermission()
}

export async function showNotification(title, body, roomId) {
  if (notifyPermission() !== 'granted') return
  const options = { body, tag: roomId, renotify: true, icon: '/icon-192.png', data: { roomId } }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg) return await reg.showNotification(title, options)
  } catch {
    // 서비스워커 알림이 안 되면 아래의 일반 알림으로
  }
  const n = new Notification(title, options)
  n.onclick = () => {
    window.focus()
    location.hash = `#/room/${roomId}`
    n.close()
  }
}

// 탭 제목에 안 읽은 수 표시: "(3) 협력사 소통방"
export function setTitleUnread(count) {
  document.title = count > 0 ? `(${count > 999 ? '999+' : count}) ${APP_NAME}` : APP_NAME
}
