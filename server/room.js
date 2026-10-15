const P = require('../shared/physics');
const R = require('./rules');

const { C } = P;
const TICK_HZ = 60;
const SEND_EVERY = 2; // 30Hz 상태 전송
const POINT_PAUSE = 1.7;
const GAME_PAUSE = 3.5;
const SERVE_TIMEOUT = 12; // 서브권자가 너무 오래 안 치면 자동 토스
const HISTORY_MS = 500; // 지연 보정용 공 상태 기록 길이
const MAX_REWIND_MS = 350; // 인터넷 지연 보정 한도
const FAULT_GRACE_MS = 300; // "못 받아침" 판정 유예 (지연된 클릭이 도착할 시간)
const RUN_SPEED = 5.5; // 캐릭터 자동 이동 속도 (m/s)

const BOT_NAMES = ['로봇 핑', '로봇 퐁', '알파 스매시', '사이보그 커트', '메카 드라이브'];

function slotsFor(mode) {
  return mode === 'doubles' ? ['A1', 'A2', 'B1', 'B2'] : ['A1', 'B1'];
}

function randn() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

class Room {
  constructor(code, opts, emit, emitTo) {
    this.code = code;
    this.mode = opts.mode === 'doubles' ? 'doubles' : 'singles';
    this.bestOf = [1, 3, 5, 7].includes(Number(opts.bestOf)) ? Number(opts.bestOf) : 3;
    this.emit = emit; // (event, payload) => 방 전체 전송
    this.emitTo = emitTo || (() => {}); // (socketId, event, payload) => 한 명에게 전송
    this.players = new Map(); // id -> player
    this.hostId = null;
    this.match = null;
    this.tickCount = 0;
    this.timer = null;
    this.rng = Math.random;
    this.clock = Date.now(); // 서버 시계(ms). 상태에 실어 보내 클라이언트와 시간을 맞춘다
    this.history = [];
    this.emptySince = null;
  }

  get doubles() {
    return this.mode === 'doubles';
  }

  get slots() {
    return slotsFor(this.mode);
  }

  playerInSlot(slot) {
    for (const p of this.players.values()) if (p.slot === slot) return p;
    return null;
  }

  freeSlot() {
    return this.slots.find((s) => !this.playerInSlot(s)) || null;
  }

  humanCount() {
    let n = 0;
    for (const p of this.players.values()) if (!p.isBot) n++;
    return n;
  }

  addPlayer(id, name, avatar, token) {
    // 연결이 끊겼던 플레이어가 다시 들어오면 원래 자리를 돌려준다
    if (token) {
      for (const [oldId, p] of this.players) {
        if (p.token === token && (p.away || oldId === id)) {
          this.players.delete(oldId);
          Object.assign(p, { id, isBot: false, away: false, bot: null });
          if (name) p.name = String(name).slice(0, 16);
          if (avatar) p.avatar = avatar;
          this.players.set(id, p);
          if (!this.hostId || !this.players.has(this.hostId) || this.playerIsAway(this.hostId)) this.hostId = id;
          this.emitLobby();
          return { player: p, rejoined: true };
        }
      }
    }
    let slot = this.freeSlot();
    if (!slot) {
      // 봇이 차지한 자리가 있으면 사람에게 넘겨준다
      for (const p of this.players.values()) {
        if (p.isBot && !p.away) {
          slot = p.slot;
          this.players.delete(p.id);
          break;
        }
      }
    }
    if (!slot) return { error: '방이 가득 찼습니다.' };
    const player = {
      id,
      token: token || null,
      name: String(name || '선수').slice(0, 16),
      avatar: avatar || null,
      slot,
      isBot: false,
      paddle: this.homePosition(slot),
    };
    this.players.set(id, player);
    if (!this.hostId || this.playerIsAway(this.hostId)) this.hostId = id;
    this.emitLobby();
    return { player };
  }

  playerIsAway(id) {
    const p = this.players.get(id);
    return !p || p.away || p.isBot;
  }

  removePlayer(id, temporary) {
    const p = this.players.get(id);
    if (!p) return;
    if (this.match && this.match.phase !== 'matchover') {
      // 경기 중 이탈/연결 끊김 → 재접속할 때까지 봇이 대신 친다
      p.isBot = true;
      p.away = !!temporary && !!p.token;
      p.bot = { skill: 0.6, plan: null };
      if (!p.away) p.token = null;
    } else {
      this.players.delete(id);
    }
    if (this.hostId === id) {
      const next = [...this.players.values()].find((q) => !q.isBot);
      this.hostId = next ? next.id : null;
    }
    this.emitLobby();
  }

  addBot(slot, name, avatar) {
    if (!this.slots.includes(slot) || this.playerInSlot(slot)) return false;
    const id = `bot-${slot}-${Math.random().toString(36).slice(2, 7)}`;
    this.players.set(id, {
      id,
      name: name || this.botName(),
      avatar: avatar || null,
      slot,
      isBot: true,
      paddle: this.homePosition(slot),
      bot: { skill: 0.55 + Math.random() * 0.3, plan: null },
    });
    this.emitLobby();
    return true;
  }

  botName() {
    const used = new Set([...this.players.values()].map((p) => p.name));
    const free = BOT_NAMES.filter((n) => !used.has(n));
    return free.length ? free[Math.floor(Math.random() * free.length)] : `로봇 ${Math.floor(Math.random() * 90 + 10)}`;
  }

  removeBot(slot) {
    const p = this.playerInSlot(slot);
    if (p && p.isBot && !p.away && (!this.match || this.match.phase === 'matchover')) {
      this.players.delete(p.id);
      this.emitLobby();
    }
  }

  moveSlot(id, slot) {
    const p = this.players.get(id);
    if (!p || (this.match && this.match.phase !== 'matchover') || !this.slots.includes(slot) || this.playerInSlot(slot)) return;
    p.slot = slot;
    p.paddle = this.homePosition(slot);
    this.emitLobby();
  }

  setAvatar(id, avatar) {
    const p = this.players.get(id);
    if (!p) return;
    p.avatar = avatar;
    this.emit('avatar', { slot: p.slot, avatar });
    this.emitLobby(true);
  }

  // 공을 기다리는 기본 위치 (복식은 파트너와 좌우로 벌려 선다)
  homePosition(slot) {
    const sgn = slot[0] === 'A' ? -1 : 1;
    const xs = slot[0] === 'A' ? 1 : -1;
    const offset = this.doubles ? (slot[1] === '1' ? 0.5 : -0.5) : 0;
    return { x: offset * xs, y: sgn * (C.HL + (this.doubles ? 0.7 : 0.5)), z: 0.2 };
  }

  lobbyState(skipAvatars) {
    return {
      code: this.code,
      mode: this.mode,
      bestOf: this.bestOf,
      hostId: this.hostId,
      started: !!this.match && this.match.phase !== 'matchover',
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        slot: p.slot,
        isBot: p.isBot,
        away: !!p.away,
        avatar: skipAvatars ? undefined : p.avatar,
      })),
    };
  }

  emitLobby(skipAvatars) {
    this.emit('lobby', this.lobbyState(skipAvatars));
  }

  /* ------------------------------------------------------------------ */
  /* 경기 진행                                                           */
  /* ------------------------------------------------------------------ */

  start(requesterId) {
    if (requesterId !== this.hostId) return '방장만 시작할 수 있습니다.';
    if (this.match && this.match.phase !== 'matchover') return '이미 경기 중입니다.';
    const missing = this.slots.filter((s) => !this.playerInSlot(s));
    if (missing.length) return `빈 자리(${missing.join(', ')})가 있습니다. 친구를 기다리거나 봇을 추가하세요.`;

    const firstServer = Math.random() < 0.5 ? 'A1' : 'B1';
    const firstReceiver = firstServer === 'A1' ? 'B1' : 'A1';
    this.match = {
      phase: 'serve',
      phaseTime: 0,
      score: { A: 0, B: 0 },
      games: { A: 0, B: 0 },
      history: [],
      gameNo: 1,
      firstServer,
      firstReceiver,
      server: firstServer,
      receiver: firstReceiver,
      ball: P.createBall(),
      fx: 'none',
      rally: null,
      ideal: null,
      winner: null,
      lastPoint: null,
    };
    this.history = [];
    this.setupServe();
    this.emit('started', { mode: this.mode, bestOf: this.bestOf });
    this.emitLobby(true);
    this.emitMatch();
    if (!this.timer) {
      let last = Date.now();
      this.timer = setInterval(() => {
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.tick(dt);
      }, 1000 / TICK_HZ);
    }
    return null;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setupServe() {
    const m = this.match;
    const total = m.score.A + m.score.B;
    const cur = R.currentServer(m.firstServer, m.firstReceiver, total, this.doubles);
    m.server = cur.server;
    m.receiver = cur.receiver;
    m.phase = 'serve';
    m.phaseTime = 0;
    m.fx = 'none';
    m.ideal = null;
    m.rally = {
      held: true,
      tossed: false,
      serveFlight: false,
      bounces: 0,
      netTouch: false,
      order: R.hittingOrder(m.server, m.receiver, this.doubles),
      idx: -1,
      lastHitter: null,
      lastTeam: null,
      lastHitAt: 0,
      canHit: false,
      dead: false,
      pending: null,
      nextHitter: m.server,
    };
    for (const p of this.players.values()) if (p.bot) p.bot.plan = null;
    this.holdBall();
  }

  // 서브 위치: 단식은 가운데 약간 오른쪽, 복식은 오른쪽 하프
  holdBall() {
    const m = this.match;
    const team = R.teamOf(m.server);
    const sgn = team === 'A' ? -1 : 1;
    const xs = team === 'A' ? 1 : -1;
    const px = (this.doubles ? 0.4 : 0.2) * xs;
    Object.assign(m.ball, {
      x: px,
      y: sgn * (C.HL + 0.12),
      z: C.SERVE_HOLD_Z,
      vx: 0,
      vy: 0,
      vz: 0,
      ax: 0,
      az: 0,
      spin: 'none',
      side: 0,
    });
  }

  handleInput(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg || p.isBot) return;
    if (!this.match) return;
    if (msg.type === 'toss') this.toss(p.slot);
    else if (msg.type === 'hit') this.hit(p.slot, msg, id);
  }

  toss(slot) {
    const m = this.match;
    if (m.phase !== 'serve' || m.server !== slot || !m.rally.held) return;
    this.holdBall();
    m.rally.held = false;
    m.rally.tossed = true;
    m.ball.vz = C.SERVE_TOSS_VZ;
    m.ball.az = -C.G;
    this.updateIdeal();
    this.emit('fx', { type: 'toss', slot });
  }

  // 다음 타자가 공을 치기 가장 좋은 순간/위치 계산 → 캐릭터 자동 이동 + 타이밍 판정 기준
  updateIdeal() {
    const m = this.match;
    const r = m.rally;
    const slot = r.nextHitter;
    const team = R.teamOf(slot);
    const mode = m.phase === 'serve' ? 'toss' : r.canHit ? 'bounced' : 'incoming';
    const pr = P.predictIdeal(m.ball, team, mode, 3);
    m.ideal = pr ? { slot, at: this.clock + pr.t * 1000, x: pr.x, y: pr.y, z: pr.z } : null;
  }

  // 지연 보정: 클라이언트가 보고 있던 시각의 기록 찾기
  rewind(ct) {
    const t = Math.max(this.clock - MAX_REWIND_MS, Math.min(this.clock, Number(ct) || this.clock));
    let best = null;
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.t <= t) {
        best = h;
        break;
      }
    }
    return { t, rec: best };
  }

  /*
   * 타격 요청.
   * opts: { kind, aimX, aimY, swingX, swingY, ct(클라이언트가 클릭한 순간의 서버 시각 ms) }
   * 타이밍 품질은 서버가 이상적 순간(ideal.at)과의 차이로 판정한다.
   */
  hit(slot, opts, socketId) {
    const m = this.match;
    const r = m.rally;
    const team = R.teamOf(slot);
    if (!m.ideal || m.ideal.slot !== slot) return false;
    const { t: ct, rec } = this.rewind(opts.ct);
    if (!rec) return false;
    const diff = (ct - m.ideal.at) / 1000;
    const quality = P.timingQuality(diff);
    if (quality <= 0) {
      if (socketId) this.emitTo(socketId, 'fx', { type: 'whiff', slot, diff });
      return false;
    }
    if (r.lastHitAt > ct) return false; // 이미 다음 타구가 진행됨

    let shot;
    let ball;
    if (m.phase === 'serve') {
      if (m.server !== slot || !r.tossed || r.serveFlight) return false;
      ball = Object.assign({}, rec.serveTossed ? rec.ball : m.ball);
      if (ball.z < -0.12) return false;
      shot = P.computeServe(ball, team, Object.assign({}, opts, { quality }), this.doubles, this.rng);
      r.serveFlight = true;
      r.idx = 0;
      m.phase = 'rally';
      m.phaseTime = 0;
    } else if (m.phase === 'rally' || (m.phase === 'point' && r.pending)) {
      // 클릭한 순간에 칠 수 있는 상태였는지 (지연 보정)
      if (!rec.canHit || rec.next !== slot) return false;
      if (r.dead && !r.pending) return false;
      if (r.pending && r.pending.at < ct) return false;
      if (r.nextHitter !== slot) return false;
      ball = Object.assign({}, rec.ball);
      if ((team === 'A' && ball.y > 0.15) || (team === 'B' && ball.y < -0.15)) return false;
      shot = P.computeShot(ball, team, Object.assign({}, opts, { quality }), this.rng);
      r.serveFlight = false;
      r.idx = (r.idx + 1) % r.order.length;
      r.pending = null;
      r.dead = false;
      m.phase = 'rally';
    } else {
      return false;
    }
    Object.assign(m.ball, ball, shot.ball);
    r.bounces = 0;
    r.netTouch = false;
    r.canHit = false;
    r.lastHitter = slot;
    r.lastTeam = team;
    r.lastHitAt = this.clock;
    r.nextHitter = r.order[(r.idx + 1) % r.order.length];
    m.fx = shot.tier;
    const hp = this.playerInSlot(slot);
    if (hp) hp.paddle = { x: ball.x, y: ball.y, z: ball.z };
    this.updateIdeal();
    this.emit('fx', {
      type: 'hit',
      slot,
      kind: shot.kind,
      tier: shot.tier,
      quality: shot.quality,
      diff,
      serve: r.serveFlight,
      curve: shot.ball.side,
      x: ball.x,
      y: ball.y,
      z: ball.z,
    });
    return true;
  }

  onBounce(x, y) {
    const m = this.match;
    const r = m.rally;
    const sideTeam = y < 0 ? 'A' : 'B';
    const hitter = r.lastTeam;
    const opp = R.otherTeam(hitter);
    this.emit('fx', { type: 'bounce', x, y });

    if (r.serveFlight) {
      if (r.bounces === 0) {
        r.bounces = 1;
        if (sideTeam !== hitter) return this.awardPoint(opp, '서브 실패: 자기 코트에 먼저 바운드해야 합니다');
        if (this.doubles && !R.inRightHalf(hitter, x)) return this.awardPoint(opp, '서브 실패: 복식은 오른쪽 하프에서 시작');
        return;
      }
      if (r.bounces === 1) {
        r.bounces = 2;
        if (sideTeam !== opp) return this.awardPoint(opp, '서브 실패: 상대 코트에 들어가지 않았습니다');
        if (this.doubles && !R.inRightHalf(opp, x)) return this.awardPoint(opp, '서브 실패: 복식 서브는 대각선으로');
        if (r.netTouch) return this.callLet('렛! 네트에 맞은 서브 — 다시 서브');
        r.canHit = true;
        this.updateIdeal();
        return;
      }
      return this.pendingPoint(hitter, '리시브 실패');
    }

    if (r.bounces === 0) {
      r.bounces = 1;
      if (sideTeam === hitter) return this.awardPoint(opp, '자기 코트에 떨어졌습니다');
      r.canHit = true;
      this.updateIdeal();
      return;
    }
    return this.pendingPoint(hitter, '투 바운드 — 받아치지 못했습니다');
  }

  onFloor() {
    const m = this.match;
    const r = m.rally;
    if (r.dead || r.pending) return;
    const hitter = r.lastTeam;
    const opp = R.otherTeam(hitter);
    if (r.serveFlight) {
      if (r.bounces < 2) return this.awardPoint(opp, '서브 아웃');
      return this.pendingPoint(hitter, '서브 에이스!');
    }
    if (r.bounces === 0) return this.awardPoint(opp, '아웃!');
    return this.pendingPoint(hitter, '받아치지 못했습니다');
  }

  // 리시버가 못 받은 경우: 늦게 도착한 클릭을 위해 잠깐 기다린 뒤 득점 처리
  pendingPoint(team, reason) {
    const r = this.match.rally;
    if (r.pending || r.dead) return;
    r.pending = { team, reason, at: this.clock };
  }

  callLet(reason) {
    const m = this.match;
    m.rally.dead = true;
    m.phase = 'point';
    m.phaseTime = 0;
    m.ideal = null;
    m.lastPoint = { team: null, reason, let: true };
    this.emit('point', { team: null, reason, let: true, score: m.score });
    m.pendingLet = true;
  }

  awardPoint(team, reason) {
    const m = this.match;
    if (m.rally.dead) return;
    m.rally.dead = true;
    m.rally.canHit = false;
    m.rally.pending = null;
    m.ideal = null;
    m.score[team] += 1;
    m.phase = 'point';
    m.phaseTime = 0;
    m.pendingLet = false;
    m.lastPoint = { team, reason };
    this.emit('point', { team, reason, score: m.score, fx: m.fx });
    this.emitMatch();
  }

  afterPoint() {
    const m = this.match;
    if (m.pendingLet) {
      m.pendingLet = false;
      this.setupServe();
      this.emitMatch();
      return;
    }
    const gw = R.gameWinner(m.score.A, m.score.B);
    if (gw) {
      m.games[gw] += 1;
      m.history.push({ A: m.score.A, B: m.score.B });
      const mw = R.matchWinner(m.games.A, m.games.B, this.bestOf);
      m.phase = mw ? 'matchover' : 'gameover';
      m.phaseTime = 0;
      m.winner = mw;
      this.emit('game', { winner: gw, games: m.games, history: m.history, match: mw });
      this.emitMatch();
      if (mw) {
        // 경기가 끝나면 연결이 끊긴 선수는 정리
        for (const [id, p] of this.players) if (p.away) this.players.delete(id);
        this.emitLobby();
      }
      return;
    }
    this.setupServe();
    this.emitMatch();
  }

  nextGame() {
    const m = this.match;
    const ns = R.nextGameServers(m.firstServer, m.firstReceiver);
    m.firstServer = ns.server;
    m.firstReceiver = ns.receiver;
    m.score = { A: 0, B: 0 };
    m.gameNo += 1;
    this.setupServe();
    this.emitMatch();
  }

  matchState() {
    const m = this.match;
    if (!m) return null;
    return {
      phase: m.phase,
      score: m.score,
      games: m.games,
      history: m.history,
      gameNo: m.gameNo,
      bestOf: this.bestOf,
      server: m.server,
      receiver: m.receiver,
      winner: m.winner,
      lastPoint: m.lastPoint,
      deuce: m.score.A >= 10 && m.score.B >= 10,
    };
  }

  emitMatch() {
    this.emit('match', this.matchState());
  }

  tick(dt) {
    const m = this.match;
    if (!m) return;
    this.clock += dt * 1000;
    m.phaseTime += dt;
    const r = m.rally;

    this.runBots();

    if (m.phase === 'serve') {
      if (r.held) {
        this.holdBall();
        if (m.phaseTime > SERVE_TIMEOUT) this.toss(m.server);
      } else {
        P.step(m.ball, dt);
        if (m.ball.z < -0.12 && !r.serveFlight && this.clock - (m.ideal ? m.ideal.at : 0) > FAULT_GRACE_MS) {
          // 토스 후 치지 못함 → 서브 실패
          r.lastTeam = R.teamOf(m.server);
          this.awardPoint(R.otherTeam(r.lastTeam), '서브 미스: 토스한 공을 치지 못했습니다');
        }
      }
    } else if (m.phase === 'rally' || m.phase === 'point') {
      const evs = P.step(m.ball, dt);
      if (m.phase === 'rally' && !r.pending) {
        for (const e of evs) {
          if (r.dead || r.pending) break;
          if (e.type === 'table') this.onBounce(e.x, e.y);
          else if (e.type === 'net') {
            if (e.touch && r.serveFlight) r.netTouch = true;
            this.emit('fx', { type: 'net', touch: e.touch });
            this.updateIdeal();
          } else if (e.type === 'floor') this.onFloor();
        }
      }
      if (m.ball.z < C.FLOOR_Z) {
        m.ball.z = C.FLOOR_Z;
        m.ball.vz = Math.abs(m.ball.vz) * 0.5;
        m.ball.vy *= 0.6;
        m.ball.vx *= 0.6;
        m.ball.ax = 0;
      }
      if (r.pending && this.clock - r.pending.at > FAULT_GRACE_MS) this.awardPoint(r.pending.team, r.pending.reason);
      if (m.phase === 'point' && m.phaseTime > POINT_PAUSE) this.afterPoint();
    } else if (m.phase === 'gameover') {
      if (m.phaseTime > GAME_PAUSE) this.nextGame();
    }

    this.movePlayers(dt);
    this.record();
    this.tickCount++;
    if (this.tickCount % SEND_EVERY === 0) this.emitState();
  }

  record() {
    const m = this.match;
    const r = m.rally;
    this.history.push({
      t: this.clock,
      ball: Object.assign({}, m.ball),
      canHit: r.canHit && !r.dead,
      next: r.nextHitter,
      serveTossed: m.phase === 'serve' && r.tossed,
    });
    while (this.history.length && this.clock - this.history[0].t > HISTORY_MS) this.history.shift();
  }

  // 캐릭터 자동 이동: 다음 타자는 공을 칠 위치로 달려가고, 나머지는 기본 위치로
  movePlayers(dt) {
    const m = this.match;
    const r = m.rally;
    for (const p of this.players.values()) {
      let target = this.homePosition(p.slot);
      if (m.phase === 'serve' && m.server === p.slot) {
        const b = m.ball;
        target = { x: b.x + (p.slot[0] === 'A' ? -0.08 : 0.08), y: b.y, z: Math.max(0.05, b.z) };
      } else if (m.ideal && m.ideal.slot === p.slot && (m.phase === 'rally' || m.phase === 'serve')) {
        target = { x: m.ideal.x, y: m.ideal.y, z: m.ideal.z };
      } else if (r && r.nextHitter === p.slot && m.phase === 'rally') {
        target = { x: m.ball.x, y: this.homePosition(p.slot).y, z: 0.2 };
      }
      const pd = p.paddle;
      const dx = target.x - pd.x;
      const dy = target.y - pd.y;
      const dz = target.z - pd.z;
      const dist = Math.hypot(dx, dy, dz);
      const stepLen = Math.min(dist, RUN_SPEED * dt);
      if (dist > 1e-6) {
        pd.x += (dx / dist) * stepLen;
        pd.y += (dy / dist) * stepLen;
        pd.z += (dz / dist) * stepLen;
      }
    }
  }

  emitState() {
    const m = this.match;
    const b = m.ball;
    const r = m.rally;
    const paddles = {};
    for (const p of this.players.values()) paddles[p.slot] = [round(p.paddle.x), round(p.paddle.y), round(p.paddle.z)];
    this.emit('state', {
      t: Math.round(this.clock),
      phase: m.phase,
      ball: [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.ax, b.az].map(round),
      spin: b.spin,
      side: round(b.side),
      fx: m.fx,
      held: r.held,
      tossed: r.tossed,
      canHit: r.canHit && !r.dead,
      next: r.nextHitter,
      server: m.server,
      ideal: m.ideal ? { slot: m.ideal.slot, at: Math.round(m.ideal.at), x: round(m.ideal.x), y: round(m.ideal.y), z: round(m.ideal.z) } : null,
      paddles,
    });
  }

  /* ------------------------------------------------------------------ */
  /* 봇 AI: 이상적 순간 근처에서 (실력만큼 오차를 두고) 클릭                 */
  /* ------------------------------------------------------------------ */
  runBots() {
    const m = this.match;
    const r = m.rally;
    for (const p of this.players.values()) {
      if (!p.isBot) continue;
      const bot = p.bot || (p.bot = { skill: 0.6, plan: null });
      const opts = () => {
        const opp = p.slot[0] === 'A' ? 1 : -1;
        return {
          kind: Math.random() < 0.65 ? 'drive' : 'cut',
          aimX: (Math.random() - 0.5) * 1.1,
          aimY: opp * (0.5 + Math.random() * 0.7),
          swingX: (Math.random() - 0.5) * 1.4,
          swingY: 0.2 + Math.random() * 0.7,
        };
      };
      if (m.phase === 'serve' && m.server === p.slot && r.held) {
        if (m.phaseTime > 1.1) this.toss(p.slot);
        continue;
      }
      const ideal = m.ideal;
      if (!ideal || ideal.slot !== p.slot) {
        bot.plan = null;
        continue;
      }
      if (!bot.plan || bot.plan.idealAt !== ideal.at) {
        const spread = 0.03 + (1 - bot.skill) * 0.12;
        // 가끔은 타이밍을 완전히 놓친다
        const miss = Math.random() < (1 - bot.skill) * 0.2 ? 0.4 : 0;
        bot.plan = { idealAt: ideal.at, at: ideal.at + (randn() * spread + miss) * 1000, done: false };
      }
      if (!bot.plan.done && this.clock >= bot.plan.at) {
        const ready = m.phase === 'serve' ? r.tossed : r.canHit;
        if (ready) {
          bot.plan.done = true;
          this.hit(p.slot, Object.assign(opts(), { ct: Math.min(this.clock, Math.max(bot.plan.at, this.clock - 20)) }));
        }
      }
    }
  }
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

module.exports = { Room, slotsFor };
