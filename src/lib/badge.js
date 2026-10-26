// 작업표시줄·홈 화면의 앱 아이콘에 안 읽은 수 표시 (앱으로 설치한 경우)
// 앱을 닫아 두었을 때는 서비스워커(sw.js)가 푸시를 받을 때마다 +1 하므로, 같은 저장소에 실제 값을 맞춰 둠
const DB = 'po3-badge'
const STORE = 'kv'

function withStore(mode, fn) {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1)
      open.onupgradeneeded = () => open.result.createObjectStore(STORE)
      open.onerror = () => resolve(null)
      open.onsuccess = () => {
        const tx = open.result.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req?.result ?? null)
        tx.onerror = () => resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
}

export function setAppBadge(count) {
  withStore('readwrite', (s) => s.put(count, 'count'))
  try {
    if (count > 0) navigator.setAppBadge?.(count)?.catch?.(() => {})
    else navigator.clearAppBadge?.()?.catch?.(() => {})
  } catch {
    // 지원하지 않는 브라우저는 무시
  }
}
