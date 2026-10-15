/*
 * Higgsfield API 연동: 사람 사진 → 우스꽝스러운 캐리커처 캐릭터.
 *
 * 흐름
 *   1) POST /files/generate-upload-url 로 업로드 URL 발급 → 사진 PUT 업로드
 *   2) POST /{HIGGSFIELD_MODEL} 에 프롬프트 + 업로드한 이미지 URL 로 생성 요청
 *   3) GET /requests/{request_id}/status 를 completed 가 될 때까지 폴링
 *   4) 결과 이미지를 서버가 내려받아 data URL 로 클라이언트에 전달 (CORS·만료 걱정 없음)
 *
 * 인증: Authorization: Key {HIGGSFIELD_API_KEY}:{HIGGSFIELD_API_SECRET}
 *       (또는 HF_KEY="키:시크릿" 한 줄로 지정)
 *
 * 모델과 이미지 입력 필드 이름은 계정에서 사용할 수 있는 이미지 편집 모델에 맞게
 * 환경변수로 바꿀 수 있다 (HIGGSFIELD_MODEL, HIGGSFIELD_IMAGE_FIELD).
 */

const BASE_URL = process.env.HIGGSFIELD_BASE_URL || 'https://api.higgsfield.ai';
const MODEL = process.env.HIGGSFIELD_MODEL || 'bytedance/seedream/v4/edit';
const IMAGE_FIELD = process.env.HIGGSFIELD_IMAGE_FIELD || 'image_urls';
const POLL_MS = 2500;
const MAX_WAIT_MS = Number(process.env.HIGGSFIELD_TIMEOUT_MS || 180000);

const PROMPT =
  process.env.HIGGSFIELD_PROMPT ||
  'Funny exaggerated caricature cartoon of this exact person as a table tennis player: ' +
    'huge head on a tiny body, big expressive eyes, goofy confident grin, keep the face recognizable, ' +
    'head and shoulders centered, wearing a sports jersey, holding a ping pong paddle, ' +
    'vibrant 3D cartoon style, plain solid light background, no text';

function credentials() {
  let key = process.env.HIGGSFIELD_API_KEY || process.env.HF_API_KEY;
  let secret = process.env.HIGGSFIELD_API_SECRET || process.env.HF_API_SECRET;
  const combined = process.env.HF_KEY || process.env.HIGGSFIELD_KEY;
  if ((!key || !secret) && combined && combined.includes(':')) {
    const i = combined.indexOf(':');
    key = combined.slice(0, i);
    secret = combined.slice(i + 1);
  }
  return key && secret ? { key, secret } : null;
}

function isConfigured() {
  return !!credentials();
}

async function api(path, init = {}) {
  const c = credentials();
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      Authorization: `Key ${c.key}:${c.secret}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data.detail ? JSON.stringify(data.detail) : text.slice(0, 300);
    const err = new Error(`Higgsfield ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl || '');
  if (!m) throw new Error('이미지 형식이 올바르지 않습니다 (png/jpg/webp).');
  return { contentType: m[1].toLowerCase().replace('jpg', 'jpeg'), buffer: Buffer.from(m[3], 'base64') };
}

async function uploadImage(dataUrl) {
  const { contentType, buffer } = parseDataUrl(dataUrl);
  const { upload_url: uploadUrl, public_url: publicUrl } = await api('/files/generate-upload-url', {
    method: 'POST',
    body: JSON.stringify({ content_type: contentType }),
  });
  const put = await fetch(uploadUrl, { method: 'PUT', body: buffer, headers: { 'Content-Type': contentType } });
  if (!put.ok) throw new Error(`이미지 업로드 실패 (${put.status})`);
  return publicUrl;
}

// 응답 형태가 모델마다 조금씩 달라서 이미지 URL 을 넓게 찾는다
function findImageUrl(resp) {
  if (!resp) return null;
  const candidates = [
    resp.images && resp.images[0] && resp.images[0].url,
    resp.image && resp.image.url,
    resp.results && resp.results.raw && resp.results.raw.url,
    resp.results && resp.results.min && resp.results.min.url,
    resp.jobs && resp.jobs[0] && resp.jobs[0].results && resp.jobs[0].results.raw && resp.jobs[0].results.raw.url,
    resp.output && resp.output[0],
  ];
  return candidates.find((u) => typeof u === 'string' && /^https?:\/\//.test(u)) || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createCaricature(dataUrl) {
  if (!isConfigured()) throw Object.assign(new Error('Higgsfield API 키가 설정되지 않았습니다.'), { status: 501 });

  const imageUrl = await uploadImage(dataUrl);
  const input = { prompt: PROMPT, aspect_ratio: '1:1' };
  input[IMAGE_FIELD] = IMAGE_FIELD.endsWith('s') ? [imageUrl] : imageUrl;

  let resp = await api('/' + MODEL.replace(/^\//, ''), { method: 'POST', body: JSON.stringify(input) });
  const started = Date.now();
  while (!findImageUrl(resp)) {
    const status = resp.status;
    if (status === 'failed' || status === 'nsfw') throw new Error(`캐릭터 생성 실패 (${status})`);
    if (!resp.request_id) throw new Error('Higgsfield 응답에 request_id 가 없습니다.');
    if (Date.now() - started > MAX_WAIT_MS) throw new Error('캐릭터 생성 시간 초과');
    await sleep(POLL_MS);
    const id = resp.request_id;
    resp = await api(`/requests/${encodeURIComponent(id)}/status`);
    if (!resp.request_id) resp.request_id = id;
  }

  const url = findImageUrl(resp);
  const img = await fetch(url);
  if (!img.ok) throw new Error(`결과 이미지 다운로드 실패 (${img.status})`);
  const type = img.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await img.arrayBuffer());
  return { dataUrl: `data:${type};base64,${buf.toString('base64')}`, sourceUrl: url };
}

module.exports = { isConfigured, createCaricature, findImageUrl };
