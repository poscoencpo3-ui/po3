/*
 * 광고(스폰서) 클라이언트
 *  - /api/ads 에서 광고 목록을 받아 자리(slot)별로 돌려 보여준다
 *  - 노출(impression)/클릭(click)을 모아서 서버로 보낸다
 */
(function () {
  const state = { rotateSec: 8, jumbotronEverySec: 30, ads: [], images: {}, queue: [], version: 0 };

  function bySlot(slot) {
    return state.ads.filter((a) => a.slots.includes(slot));
  }

  // 가중치(weight)만큼 자주 나오도록 펼친 목록
  function weighted(slot) {
    const out = [];
    for (const a of bySlot(slot)) for (let i = 0; i < a.weight; i++) out.push(a);
    return out;
  }

  function track(id, type, slot) {
    state.queue.push({ id, type, slot });
    if (state.queue.length >= 20) flush();
  }

  function flush() {
    if (!state.queue.length) return;
    const events = state.queue.splice(0, 50);
    fetch('/api/ads/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {});
  }
  setInterval(flush, 15000);
  window.addEventListener('pagehide', flush);

  async function init() {
    try {
      const res = await fetch('/api/ads');
      const cfg = await res.json();
      state.rotateSec = cfg.rotateSec || 8;
      state.jumbotronEverySec = cfg.jumbotronEverySec || 30;
      state.ads = cfg.ads || [];
      for (const a of state.ads) {
        if (a.image && !state.images[a.image]) {
          const img = new Image();
          img.onload = () => state.version++;
          img.src = a.image;
          state.images[a.image] = img;
        }
      }
      state.version++;
      renderLobbyBanner();
    } catch (e) {
      /* 광고가 없어도 게임은 동작 */
    }
  }

  /*
   * 코트 광고판 세트: count 개 자리에 광고를 배치. rotateSec 마다 한 칸씩 밀린다.
   * 반환값의 key 가 바뀌면 광고판을 다시 그리면 된다.
   */
  let lastBoardKey = '';
  function boards(count, now) {
    const list = weighted('board');
    if (!list.length) return { key: 'none', ads: [] };
    const shift = Math.floor(now / 1000 / state.rotateSec);
    const ads = [];
    for (let i = 0; i < count; i++) ads.push(list[(i * 3 + shift) % list.length]);
    const key = `${shift}:${state.version}`;
    if (key !== lastBoardKey) {
      lastBoardKey = key;
      const seen = new Set(ads.map((a) => a.id));
      for (const id of seen) track(id, 'impression', 'board');
    }
    return { key, ads };
  }

  // 전광판: jumbotronEverySec 마다 5초 동안 광고 (점수가 막 바뀐 직후엔 점수 우선)
  let lastJumboId = null;
  function jumbotron(now) {
    const list = weighted('jumbotron');
    if (!list.length) return null;
    const period = state.jumbotronEverySec * 1000;
    const phase = now % period;
    if (phase > 5000) {
      lastJumboId = null;
      return null;
    }
    const ad = list[Math.floor(now / period) % list.length];
    if (lastJumboId !== ad.id) {
      lastJumboId = ad.id;
      track(ad.id, 'impression', 'jumbotron');
    }
    return ad;
  }

  function image(ad) {
    const img = ad && ad.image && state.images[ad.image];
    return img && img.complete && img.naturalWidth ? img : null;
  }

  // 대기실 배너 (HTML)
  function renderLobbyBanner() {
    const el = document.getElementById('lobbyAd');
    if (!el) return;
    const list = weighted('lobby');
    if (!list.length) {
      el.classList.add('hidden');
      return;
    }
    const ad = list[Math.floor(Math.random() * list.length)];
    el.classList.remove('hidden');
    el.style.background = ad.bg;
    el.style.color = ad.fg;
    el.innerHTML = '';
    if (ad.image) {
      const img = document.createElement('img');
      img.src = ad.image;
      img.alt = '';
      el.append(img);
    }
    const txt = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = ad.title;
    const s = document.createElement('span');
    s.textContent = ad.sub || '';
    txt.append(b, s);
    el.append(txt);
    const tag = document.createElement('small');
    tag.textContent = '광고';
    el.append(tag);
    el.style.cursor = ad.url ? 'pointer' : 'default';
    el.onclick = () => {
      if (!ad.url) return;
      track(ad.id, 'click', 'lobby');
      flush();
      window.open(ad.url, '_blank', 'noopener');
    };
    track(ad.id, 'impression', 'lobby');
  }

  window.Ads = { init, boards, jumbotron, image, renderLobbyBanner };
})();
