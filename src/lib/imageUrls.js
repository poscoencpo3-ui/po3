import { supabase, BUCKET } from './supabase'

// 비공개 버킷의 사진은 서명된 임시 주소로만 볼 수 있어서, 요청을 모아 한 번에 받아옵니다.
const TTL_SECONDS = 60 * 60
const cache = new Map() // path -> { url, expires }
let queue = new Map() // path -> [{ resolve, reject }]
let timer = null

export function getCachedImageUrl(path) {
  const hit = cache.get(path)
  return hit && hit.expires > Date.now() ? hit.url : null
}

export function primeImageUrl(path, url) {
  cache.set(path, { url, expires: Date.now() + 24 * 60 * 60 * 1000 })
}

export function getImageUrl(path) {
  const cached = getCachedImageUrl(path)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    if (!queue.has(path)) queue.set(path, [])
    queue.get(path).push({ resolve, reject })
    if (!timer) timer = setTimeout(flush, 30)
  })
}

async function flush() {
  const batch = queue
  queue = new Map()
  timer = null
  const paths = [...batch.keys()]
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS)
  const byPath = new Map((data || []).map((d) => [d.path, d]))
  for (const [path, waiters] of batch) {
    const item = byPath.get(path)
    if (item && item.signedUrl) {
      cache.set(path, { url: item.signedUrl, expires: Date.now() + (TTL_SECONDS - 300) * 1000 })
      waiters.forEach((w) => w.resolve(item.signedUrl))
    } else {
      const err = error || new Error((item && item.error) || 'IMAGE_NOT_FOUND')
      waiters.forEach((w) => w.reject(err))
    }
  }
}
