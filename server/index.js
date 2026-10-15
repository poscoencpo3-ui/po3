const fs = require('fs');
const path = require('path');

// .env 파일이 있으면 환경변수로 읽는다 (Node 20.12+/21.7+)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envPath);

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Room } = require('./room');
const higgsfield = require('./higgsfield');
const ads = require('./ads');

const PORT = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 6e6 });

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

app.set('trust proxy', 1);
app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

app.get('/api/config', (_req, res) => {
  res.json({ higgsfield: higgsfield.isConfigured() });
});

// 광고(스폰서) — server/ads.json 참고
app.get('/api/ads', (_req, res) => res.json(ads.publicConfig()));
app.post('/api/ads/events', (req, res) => res.json({ ok: true, recorded: ads.record(req.body && req.body.events) }));
app.get('/api/ads/stats', (req, res) => {
  const key = process.env.ADS_ADMIN_KEY;
  if (!key || req.query.key !== key) return res.status(404).json({ error: 'not found' });
  res.json(ads.getStats());
});

app.post('/api/caricature', async (req, res) => {
  try {
    const out = await higgsfield.createCaricature(req.body && req.body.image);
    res.json({ ok: true, image: out.dataUrl, source: 'higgsfield' });
  } catch (e) {
    console.warn('[higgsfield]', e.message);
    res.status(e.status === 501 ? 501 : 502).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------------------------- */
/* 방(게임장) 관리                                                    */
/* ---------------------------------------------------------------- */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}

function createRoom(opts) {
  const code = newCode();
  const room = new Room(
    code,
    opts,
    (ev, payload) => io.to(code).emit(ev, payload),
    (id, ev, payload) => io.to(id).emit(ev, payload)
  );
  rooms.set(code, room);
  return room;
}

// 사람이 아무도 없으면 잠시 기다렸다가(재접속 대비) 방을 지운다
const ROOM_GRACE_MS = 90 * 1000;
function cleanupRoom(room) {
  if (room.humanCount() > 0) return;
  room.emptySince = Date.now();
  setTimeout(() => {
    if (rooms.get(room.code) === room && room.humanCount() === 0 && Date.now() - room.emptySince >= ROOM_GRACE_MS - 50) {
      room.stop();
      rooms.delete(room.code);
    }
  }, ROOM_GRACE_MS);
}

io.on('connection', (socket) => {
  let room = null;

  const enter = (r, msg, ack) => {
    const token = typeof msg.token === 'string' ? msg.token.slice(0, 64) : null;
    const res = r.addPlayer(socket.id, msg.name, msg.avatar, token);
    if (res.error) return ack && ack({ error: res.error });
    room = r;
    socket.join(r.code);
    ack && ack({ ok: true, code: r.code, you: socket.id, slot: res.player.slot, rejoined: !!res.rejoined, lobby: r.lobbyState(), match: r.matchState() });
    r.emitLobby();
  };

  socket.on('create', (msg = {}, ack) => {
    if (room) return ack && ack({ error: '이미 방에 있습니다.' });
    const r = createRoom({ mode: msg.mode, bestOf: msg.bestOf });
    enter(r, msg, ack);
  });

  socket.on('join', (msg = {}, ack) => {
    if (room) return ack && ack({ error: '이미 방에 있습니다.' });
    const code = String(msg.code || '').trim().toUpperCase();
    const r = rooms.get(code);
    if (!r) return ack && ack({ error: `코드 ${code || '(빈값)'} 게임장을 찾을 수 없습니다.` });
    enter(r, msg, ack);
  });

  socket.on('slot', (slot) => room && room.moveSlot(socket.id, String(slot)));
  socket.on('addBot', (slot) => room && room.hostId === socket.id && room.addBot(String(slot)));
  socket.on('removeBot', (slot) => room && room.hostId === socket.id && room.removeBot(String(slot)));
  socket.on('avatar', (avatar) => {
    if (room && typeof avatar === 'string' && avatar.length < 5e6) room.setAvatar(socket.id, avatar);
  });
  socket.on('start', (_m, ack) => {
    if (!room) return;
    const err = room.start(socket.id);
    ack && ack(err ? { error: err } : { ok: true });
  });
  socket.on('input', (msg) => room && room.handleInput(socket.id, msg));
  socket.on('ping2', (_m, ack) => typeof ack === 'function' && ack(Date.now()));

  socket.on('leave', () => {
    if (!room) return;
    socket.leave(room.code);
    room.removePlayer(socket.id);
    cleanupRoom(room);
    room = null;
  });

  socket.on('disconnect', () => {
    if (!room) return;
    room.removePlayer(socket.id, true); // 재접속하면 같은 자리로 복귀
    cleanupRoom(room);
    room = null;
  });
});

server.listen(PORT, () => {
  console.log(`🏓 Ping-Pong Arena: http://localhost:${PORT}`);
  console.log(higgsfield.isConfigured() ? '   Higgsfield 캐릭터 생성: 사용' : '   Higgsfield 키 없음 → 브라우저 자체 캐리커처로 대체');
});
