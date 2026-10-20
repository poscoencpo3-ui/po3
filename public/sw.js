/*
 * 서비스 워커: 홈 화면에 설치한 앱이 빠르게 열리도록 화면 파일을 저장해 둔다.
 * 항상 최신 버전을 먼저 받아오고(network-first), 인터넷이 끊겼을 때만 저장본을 쓴다.
 * 실제 경기는 서버 연결이 필요하다.
 */
const CACHE = 'pingpong-v1';
const SHELL = [
  '/',
  '/css/style.css',
  '/js/audio.js',
  '/js/caricature.js',
  '/js/ads.js',
  '/js/arena.js',
  '/js/game.js',
  '/shared/physics.js',
  '/socket.io/socket.io.js',
  '/icons/icon-192.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // 게임 통신과 API 는 항상 서버로
  if (url.pathname.startsWith('/api/') || (url.pathname.startsWith('/socket.io/') && url.search)) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname === '/' ? '/' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(url.pathname === '/' ? '/' : req).then((r) => r || caches.match('/')))
  );
});
