import { useEffect, useState } from 'react'

// 빌드할 때 정해지는 버전 (vite.config.js). 배포된 /version.json 과 다르면 새 버전이 나온 것
export const APP_VERSION = __APP_VERSION__

export function formatVersion(v = APP_VERSION) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}.${p(kst.getUTCMonth() + 1)}.${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`
}

// 쓰던 글이나 열린 창이 없으면 바로 새 버전으로 바꿔도 잃는 것이 없음
function safeToReload() {
  const typing = [...document.querySelectorAll('textarea, input')].some((el) => el.value && el.type !== 'checkbox')
  return !typing && !document.querySelector('.modal-backdrop')
}

const RELOAD_KEY = 'po3.reloadedFor'
function reloadedFor() {
  try {
    return sessionStorage.getItem(RELOAD_KEY)
  } catch {
    return null
  }
}
function rememberReload(version) {
  try {
    sessionStorage.setItem(RELOAD_KEY, version)
  } catch {
    // 저장이 안 되는 브라우저는 안내 띄우기로만
  }
}

// 홈 화면 앱은 완전히 닫지 않으면 예전 화면을 계속 들고 있으므로, 새 버전이 나왔는지 주기적으로 확인
export function useUpdateAvailable() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    let stopped = false
    let found = null
    const check = async (returning) => {
      if (document.hidden) return
      if (!found) {
        try {
          const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
          const { version } = await res.json()
          if (version && version !== APP_VERSION) found = version
        } catch {
          return
        }
      }
      if (stopped || !found) return
      // 앱을 다시 열었을 때(백그라운드 → 화면)는 조용히 바로 적용, 사용 중이면 안내만.
      // 같은 버전으로는 한 번만 자동 적용 (예전 파일이 계속 오면 새로고침이 반복되지 않도록)
      if (returning && safeToReload() && reloadedFor() !== found) {
        rememberReload(found)
        location.reload()
      } else setAvailable(true)
    }
    const onVisible = () => check(true)
    check(true)
    const timer = setInterval(() => check(false), 10 * 60 * 1000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [])
  return available
}
