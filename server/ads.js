/*
 * 광고(스폰서) 관리
 *
 * - 광고 목록은 JSON 파일(기본: server/ads.json, ADS_FILE 로 변경)에 둔다.
 *   파일을 고치면 서버 재시작 없이 자동으로 다시 읽는다.
 * - 광고 자리(slot)
 *     board     : 코트 주변 LED 광고판 (경기 화면)
 *     jumbotron : 천장 전광판 — 점수 화면 사이사이에 잠깐씩
 *     lobby     : 대기실 배너 (클릭 시 url 로 이동)
 * - 노출/클릭은 /api/ads/events 로 모아서 메모리에 집계하고,
 *   ADS_ADMIN_KEY 를 설정하면 /api/ads/stats?key=... 로 확인할 수 있다.
 */
const fs = require('fs');
const path = require('path');

const FILE = process.env.ADS_FILE || path.join(__dirname, 'ads.json');
const SLOTS = ['board', 'jumbotron', 'lobby'];
const COLOR = /^#[0-9a-fA-F]{3,8}$/;

let config = { rotateSec: 8, jumbotronEverySec: 30, ads: [] };
const stats = new Map(); // id -> { impressions: {slot:n}, clicks: n }

function str(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function sanitizeAd(a) {
  if (!a || typeof a !== 'object' || !a.id) return null;
  const slots = Array.isArray(a.slots) ? a.slots.filter((s) => SLOTS.includes(s)) : [];
  if (!slots.length) return null;
  const image = str(a.image, 500);
  const url = str(a.url, 500);
  return {
    id: str(String(a.id), 60),
    slots,
    title: str(a.title, 40),
    sub: str(a.sub, 60),
    bg: COLOR.test(a.bg) ? a.bg : '#0b3d91',
    fg: COLOR.test(a.fg) ? a.fg : '#ffffff',
    // 이미지: 같은 서버 경로(/ads/...) 또는 https 주소만 허용
    image: /^(\/[\w\-./]+|https:\/\/[^\s"']+)$/.test(image) ? image : '',
    url: /^https?:\/\/[^\s"']+$/.test(url) ? url : '',
    weight: Math.max(1, Math.min(10, Number(a.weight) || 1)),
    start: a.start ? Date.parse(a.start) || 0 : 0,
    end: a.end ? Date.parse(a.end) || 0 : 0,
  };
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    config = {
      rotateSec: Math.max(3, Number(raw.rotateSec) || 8),
      jumbotronEverySec: Math.max(10, Number(raw.jumbotronEverySec) || 30),
      ads: (Array.isArray(raw.ads) ? raw.ads : []).map(sanitizeAd).filter(Boolean),
    };
    console.log(`[ads] ${config.ads.length}개 광고 로드 (${FILE})`);
  } catch (e) {
    console.warn('[ads] 광고 파일을 읽지 못했습니다:', e.message);
  }
}

load();
try {
  fs.watchFile(FILE, { interval: 3000 }, load);
} catch (e) {
  /* 감시 실패는 무시 */
}

function activeAds(now = Date.now()) {
  return config.ads
    .filter((a) => (!a.start || a.start <= now) && (!a.end || a.end > now))
    .map(({ start, end, ...rest }) => rest);
}

function publicConfig() {
  return { rotateSec: config.rotateSec, jumbotronEverySec: config.jumbotronEverySec, ads: activeAds() };
}

function record(events) {
  if (!Array.isArray(events)) return 0;
  const known = new Set(config.ads.map((a) => a.id));
  let n = 0;
  for (const e of events.slice(0, 50)) {
    if (!e || !known.has(e.id)) continue;
    const s = stats.get(e.id) || { impressions: {}, clicks: 0 };
    if (e.type === 'click') s.clicks += 1;
    else if (e.type === 'impression' && SLOTS.includes(e.slot)) s.impressions[e.slot] = (s.impressions[e.slot] || 0) + 1;
    else continue;
    stats.set(e.id, s);
    n++;
  }
  return n;
}

function getStats() {
  return Object.fromEntries(stats);
}

module.exports = { publicConfig, record, getStats };
