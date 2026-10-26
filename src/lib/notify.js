import { APP_NAME } from './supabase'

export const notifySupported = typeof window !== 'undefined' && 'Notification' in window

export function notifyPermission() {
  return notifySupported ? Notification.permission : 'unsupported'
}

export async function requestNotifyPermission() {
  if (!notifySupported) return 'unsupported'
  return Notification.requestPermission()
}

export async function showNotification(title, body, roomId, messageId) {
  if (notifyPermission() !== 'granted') return
  const options = { body, tag: roomId, renotify: true, icon: '/icon-192.png', data: { roomId, messageId } }
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

// 읽은 방의 알림을 알림창에서 지움.
// 안드로이드는 홈 화면 아이콘 숫자가 '알림창에 남은 알림 개수'라서, 지우지 않으면 읽어도 숫자가 남음
export async function clearRoomNotifications(roomIds) {
  const ids = new Set(Array.isArray(roomIds) ? roomIds : [roomIds])
  if (!ids.size || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    for (const n of await reg.getNotifications()) {
      if (ids.has(n.data?.roomId)) n.close()
    }
  } catch {
    // 알림 목록을 못 읽는 브라우저는 무시
  }
}

// 탭 제목에 안 읽은 수 표시: "(3) 협력사 소통방"
export function setTitleUnread(count) {
  document.title = count > 0 ? `(${count > 999 ? '999+' : count}) ${APP_NAME}` : APP_NAME
}
