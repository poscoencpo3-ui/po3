// 푸시 알림 표시 + 알림 클릭 시 해당 채팅방 열기 + 앱 아이콘 숫자

// 앱 아이콘 숫자 저장 (페이지의 src/lib/badge.js 와 같은 저장소)
function badgeStore(mode, fn) {
  return new Promise((resolve) => {
    const open = indexedDB.open('po3-badge', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onerror = () => resolve(null)
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode)
      const req = fn(tx.objectStore('kv'))
      tx.oncomplete = () => resolve(req && req.result)
      tx.onerror = () => resolve(null)
    }
  })
}

// 앱이 닫혀 있을 때만 +1 (열려 있으면 페이지가 정확한 합계로 맞춤)
async function bumpBadge(windows) {
  if (windows.length || !self.navigator.setAppBadge) return
  const current = (await badgeStore('readonly', (s) => s.get('count'))) || 0
  await badgeStore('readwrite', (s) => s.put(current + 1, 'count'))
  await self.navigator.setAppBadge(current + 1).catch(() => {})
}
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: '새 메시지', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      // 그 채팅방을 지금 보고 있으면 알림을 띄우지 않음
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const viewing = windows.some(
        (c) => c.focused && c.visibilityState === 'visible' && data.roomId && c.url.includes(`#/room/${data.roomId}`)
      )
      if (viewing && !data.urgent && !data.test) return
      if (!data.test) await bumpBadge(windows)
      await self.registration.showNotification(data.title || '새 메시지', {
        body: data.body || '',
        tag: data.test ? 'push-test' : data.urgent ? `urgent-${Date.now()}` : data.roomId,
        renotify: true,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: Boolean(data.urgent), // 긴급은 직접 닫을 때까지 화면에 남음
        vibrate: data.urgent ? [400, 150, 400, 150, 400] : [150],
        data: { roomId: data.roomId, messageId: data.messageId },
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const roomId = event.notification.data && event.notification.data.roomId
  const target = roomId ? `/#/room/${roomId}` : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
