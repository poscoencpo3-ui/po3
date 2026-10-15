const P = require('../shared/physics');
const R = require('./rules');

const { C } = P;
const TICK_HZ = 60;
const SEND_EVERY = 2; // 30Hz 상태 전송
const POINT_PAUSE = 1.7;
const GAME_PAUSE = 3.5;
const SERVE_TIMEOUT = 12; // 서브권자가 너무 오래 안 치면 봇처럼 자동 토스

const BOT_NAMES = ['로봇 핑', '로봇 퐁', '알파 스매시', '사이보그 커트', '메카 드라이브'];

function slotsFor(mode) {
  return mode === 'doubles' ? ['A1', 'A2', 'B1', 'B2'] : ['A1', 'B1'];
}

class Room {
  constructor(code, opts, emit) {
    this.code = code;
    this.mode = opts.mode === 'doubles' ? 'doubles' : 'singles';
    this.bestOf = [1, 3, 5, 7].includes(Number(opts.bestOf)) ? Number(opts.bestOf) : 3;
    this.emit = emit; // (event, payload) => broadcast to room
    this.players = new Map(); // id -> player
    this.hostId = null;
    this.match = null;
    this.tickCount = 0;
    this.timer = null;
    this.rng = Math.random;
    this.createdAt = Date.now();
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

  addPlayer(id, name, avatar) {
    let slot = this.freeSlot();
    if (!slot) {
      // 경기 중 봇이 차지한 자리가 있으면 사람에게 넘겨준다
      for (const p of this.players.values()) {
        if (p.isBot) {
          slot = p.slot;
          this.players.delete(p.id);
          break;
        }
      }
    }
    if (!slot) return { error: '방이 가득 찼습니다.' };
    const player = {
      id,
      name: String(name || '선수').slice(0, 16),
      avatar: avatar || null,
      slot,
      isBot: false,
      paddle: this.defaultPaddle(slot),
    };
    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;
    this.emitLobby();
    return { player };
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    if (this.match && this.match.phase !== 'matchover') {
      // 경기 중 이탈 → 같은 자리에 봇 투입
      this.addBot(p.slot, `${p.name}(봇)`, p.avatar);
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
      name: name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      avatar: avatar || null,
      slot,
      isBot: true,
      paddle: this.defaultPaddle(slot),
      bot: { skill: 0.55 + Math.random() * 0.3, wait: 0 },
    });
    this.emitLobby();
    return true;
  }

  removeBot(slot) {
    const p = this.playerInSlot(slot);
    if (p && p.isBot && !this.match) {
      this.players.delete(p.id);
      this.emitLobby();
    }
  }

  moveSlot(id, slot) {
    const p = this.players.get(id);
    if (!p || this.match || !this.slots.includes(slot) || this.playerInSlot(slot)) return;
    p.slot = slot;
    p.paddle = this.defaultPaddle(slot);
    this.emitLobby();
  }

  setAvatar(id, avatar) {
    const p = this.players.get(id);
    if (!p) return;
    p.avatar = avatar;
    this.emit('avatar', { slot: p.slot, avatar });
    this.emitLobby(true);
  }

  defaultPaddle(slot) {
    const dir = slot[0] === 'A' ? -1 : 1;
    const offset = this.doubles ? (slot[1] === '1' ? 0.55 : -0.55) : 0;
    return { x: offset * (slot[0] === 'A' ? 1 : -1), y: dir * (C.HL + 0.3), z: 0.2 };
  }

  lobbyState(skipAvatars) {
    return {
      code: this.code,
      mode: this.mode,
      bestOf: this.bestOf,
      hostId: this.hostId,
      started: !!this.match,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        slot: p.slot,
        isBot: p.isBot,
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
      winner: null,
      lastPoint: null,
    };
    this.setupServe();
    this.emit('started', { mode: this.mode, bestOf: this.bestOf });
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
      canHit: false,
      dead: false,
      nextHitter: m.server,
    };
    this.holdBall();
  }

  holdBall() {
    const m = this.match;
    const team = R.teamOf(m.server);
    const sgn = team === 'A' ? -1 : 1;
    const xs = team === 'A' ? 1 : -1;
    const sp = this.playerInSlot(m.server);
    let px = sp ? sp.paddle.x : 0;
    // 복식은 서버 오른쪽 하프에서 서브
    if (this.doubles) {
      const pxP = P.clamp(px * xs, 0.2, C.HW - 0.05);
      px = pxP * xs;
    } else {
      px = P.clamp(px, -C.HW + 0.05, C.HW - 0.05);
    }
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
    if (!p || !msg) return;
    if (msg.type === 'paddle') {
      const x = Number(msg.x);
      const y = Number(msg.y);
      const z = Number(msg.z);
      if ([x, y, z].every(Number.isFinite)) {
        p.paddle = { x: P.clamp(x, -3, 3), y: P.clamp(y, -4, 4), z: P.clamp(z, -0.7, 1.2) };
      }
      return;
    }
    if (!this.match) return;
    if (msg.type === 'toss') this.toss(p.slot);
    else if (msg.type === 'hit') this.hit(p.slot, msg);
  }

  toss(slot) {
    const m = this.match;
    if (m.phase !== 'serve' || m.server !== slot || !m.rally.held) return;
    this.holdBall();
    m.rally.held = false;
    m.rally.tossed = true;
    m.ball.vz = C.SERVE_TOSS_VZ;
    m.ball.az = -C.G;
    this.emit('fx', { type: 'toss', slot });
  }

  hit(slot, opts) {
    const m = this.match;
    const r = m.rally;
    const team = R.teamOf(slot);
    let shot;
    if (m.phase === 'serve') {
      if (m.server !== slot || !r.tossed || m.ball.z < -0.12) return;
      shot = P.computeServe(m.ball, team, opts, this.doubles, this.rng);
      r.serveFlight = true;
      r.idx = 0;
      m.phase = 'rally';
      m.phaseTime = 0;
    } else if (m.phase === 'rally') {
      if (r.dead || !r.canHit || r.nextHitter !== slot) return;
      // 공이 내 코트 쪽에 있어야 칠 수 있다
      if ((team === 'A' && m.ball.y > 0.15) || (team === 'B' && m.ball.y < -0.15)) return;
      shot = P.computeShot(m.ball, team, opts, this.rng);
      r.serveFlight = false;
      r.idx = (r.idx + 1) % r.order.length;
    } else {
      return;
    }
    Object.assign(m.ball, shot.ball);
    r.bounces = 0;
    r.netTouch = false;
    r.canHit = false;
    r.lastHitter = slot;
    r.lastTeam = team;
    r.nextHitter = r.order[(r.idx + 1) % r.order.length];
    m.fx = shot.tier;
    this.emit('fx', {
      type: 'hit',
      slot,
      kind: shot.kind,
      tier: shot.tier,
      quality: shot.quality,
      power: shot.power,
      serve: r.serveFlight,
      curve: shot.ball.side,
    });
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
        return;
      }
      return this.awardPoint(hitter, '리시브 실패');
    }

    if (r.bounces === 0) {
      r.bounces = 1;
      if (sideTeam === hitter) return this.awardPoint(opp, '자기 코트에 떨어졌습니다');
      r.canHit = true;
      return;
    }
    // 같은 코트에 두 번 바운드
    return this.awardPoint(hitter, '투 바운드');
  }

  onFloor() {
    const m = this.match;
    const r = m.rally;
    if (r.dead) return;
    const hitter = r.lastTeam;
    const opp = R.otherTeam(hitter);
    if (r.serveFlight) {
      if (r.bounces < 2) return this.awardPoint(opp, '서브 아웃');
      return this.awardPoint(hitter, '서브 에이스!');
    }
    if (r.bounces === 0) return this.awardPoint(opp, '아웃!');
    return this.awardPoint(hitter, '받아치지 못했습니다');
  }

  callLet(reason) {
    const m = this.match;
    m.rally.dead = true;
    m.phase = 'point';
    m.phaseTime = 0;
    m.lastPoint = { team: null, reason, let: true };
    this.emit('point', { team: null, reason, let: true, score: m.score });
    m.pendingLet = true;
  }

  awardPoint(team, reason) {
    const m = this.match;
    if (m.rally.dead) return;
    m.rally.dead = true;
    m.rally.canHit = false;
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
    m.phaseTime += dt;
    const r = m.rally;

    this.runBots(dt);

    if (m.phase === 'serve') {
      if (r.held) {
        this.holdBall();
        if (m.phaseTime > SERVE_TIMEOUT) this.toss(m.server);
      } else {
        P.step(m.ball, dt);
        if (m.ball.z < -0.12 && !r.serveFlight) {
          // 토스 후 치지 못함 → 서브 실패
          r.lastTeam = R.teamOf(m.server);
          this.awardPoint(R.otherTeam(r.lastTeam), '서브 미스: 토스한 공을 치지 못했습니다');
        }
      }
    } else if (m.phase === 'rally' || m.phase === 'point') {
      const evs = P.step(m.ball, dt);
      if (m.phase === 'rally') {
        for (const e of evs) {
          if (r.dead) break;
          if (e.type === 'table') this.onBounce(e.x, e.y);
          else if (e.type === 'net') {
            if (e.touch && r.serveFlight) r.netTouch = true;
            this.emit('fx', { type: 'net', touch: e.touch });
          } else if (e.type === 'floor') this.onFloor();
        }
      } else if (m.ball.z < C.FLOOR_Z) {
        m.ball.z = C.FLOOR_Z;
        m.ball.vz = Math.abs(m.ball.vz) * 0.5;
        m.ball.vy *= 0.6;
        m.ball.vx *= 0.6;
      }
      if (m.phase === 'point' && m.phaseTime > POINT_PAUSE) this.afterPoint();
    } else if (m.phase === 'gameover') {
      if (m.phaseTime > GAME_PAUSE) this.nextGame();
    }

    this.tickCount++;
    if (this.tickCount % SEND_EVERY === 0) this.emitState();
  }

  emitState() {
    const m = this.match;
    const b = m.ball;
    const r = m.rally;
    const paddles = {};
    for (const p of this.players.values()) paddles[p.slot] = [round(p.paddle.x), round(p.paddle.y), round(p.paddle.z)];
    this.emit('state', {
      t: Date.now(),
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
      paddles,
    });
  }

  /* ------------------------------------------------------------------ */
  /* 봇 AI                                                               */
  /* ------------------------------------------------------------------ */
  runBots(dt) {
    const m = this.match;
    const r = m.rally;
    const b = m.ball;
    for (const p of this.players.values()) {
      if (!p.isBot) continue;
      const team = R.teamOf(p.slot);
      const sgn = team === 'A' ? -1 : 1;
      const home = this.defaultPaddle(p.slot);
      const mine = r && r.nextHitter === p.slot;
      const tx = mine ? b.x : home.x;
      const ty = mine && b.y * sgn > 0 ? b.y : home.y;
      const tz = mine ? Math.max(b.z, 0) : 0.2;
      const k = Math.min(1, dt * 7);
      p.paddle.x += (tx - p.paddle.x) * k;
      p.paddle.y += (ty - p.paddle.y) * k;
      p.paddle.z += (tz - p.paddle.z) * k;

      const bot = p.bot;
      const swing = () => ({
        kind: Math.random() < 0.65 ? 'drive' : 'cut',
        swingX: (Math.random() - 0.5) * 1.4,
        swingY: 0.2 + Math.random() * 0.7,
        quality: P.clamp(bot.skill + (Math.random() - 0.5) * 0.5, 0.15, 0.95),
      });

      if (m.phase === 'serve' && m.server === p.slot) {
        if (r.held && m.phaseTime > 1.1) this.toss(p.slot);
        else if (r.tossed && b.vz < 0 && b.z < 0.35) this.hit(p.slot, swing());
      } else if (m.phase === 'rally' && mine && r.canHit && !r.dead) {
        const ready = (b.vz < 0 && b.z < 0.25) || Math.abs(b.y) > C.HL + 0.25;
        if (ready) {
          // 가끔은 놓친다
          if (bot.wait === 0) bot.wait = Math.random() < 0.08 * (1 - bot.skill) * 4 ? -1 : 1;
          if (bot.wait === 1) this.hit(p.slot, swing());
        }
      }
      if (!mine || !r.canHit) bot.wait = 0;
    }
  }
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

module.exports = { Room, slotsFor };
