const test = require('node:test');
const assert = require('node:assert');
const R = require('../server/rules');
const P = require('../shared/physics');
const { Room } = require('../server/room');

test('단식 서브: 2점마다 교대, 10:10 이후 1점마다 교대', () => {
  const at = (n) => R.currentServer('A1', 'B1', n, false).server;
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map(at), ['A1', 'A1', 'B1', 'B1', 'A1', 'A1']);
  assert.strictEqual(at(20), 'A1');
  assert.strictEqual(at(21), 'B1');
  assert.strictEqual(at(22), 'A1');
});

test('복식 서브 순서: A1→B1, B1→A2, A2→B2, B2→A1', () => {
  const seq = [0, 2, 4, 6, 8].map((n) => R.currentServer('A1', 'B1', n, true));
  assert.deepStrictEqual(
    seq.map((s) => s.server + '>' + s.receiver),
    ['A1>B1', 'B1>A2', 'A2>B2', 'B2>A1', 'A1>B1']
  );
});

test('복식 타구 순서', () => {
  assert.deepStrictEqual(R.hittingOrder('B1', 'A2', true), ['B1', 'A2', 'B2', 'A1']);
});

test('게임/매치 승리 조건 (11점, 2점 차)', () => {
  assert.strictEqual(R.gameWinner(11, 9), 'A');
  assert.strictEqual(R.gameWinner(11, 10), null);
  assert.strictEqual(R.gameWinner(12, 14), 'B');
  assert.strictEqual(R.matchWinner(2, 1, 3), 'A');
  assert.strictEqual(R.matchWinner(2, 2, 5), null);
});

function simulate(ball, maxT) {
  const evs = [];
  for (let t = 0; t < maxT; t += 1 / 60) {
    for (const e of P.step(ball, 1 / 60)) evs.push(e);
    if (evs.some((e) => e.type === 'floor')) break;
  }
  return evs;
}

test('완벽한 타구는 네트를 넘어 상대 코트에 떨어진다 (드라이브/커트/커브)', () => {
  const rng = () => 0.5;
  for (const kind of ['drive', 'cut']) {
    for (const swingX of [-1, 0, 1]) {
      const ball = Object.assign(P.createBall(), { x: 0.2, y: -1.5, z: 0.2 });
      const shot = P.computeShot(ball, 'A', { kind, swingX, swingY: 0.6, quality: 1 }, rng);
      Object.assign(ball, shot.ball);
      const first = simulate(ball, 3).find((e) => e.type !== 'net' || !e.touch);
      assert.strictEqual(first.type, 'table', `${kind} ${swingX}`);
      assert.ok(first.y > 0, `${kind} ${swingX} 상대 코트`);
    }
  }
});

test('서브는 자기 코트 → 상대 코트 순으로 바운드 (복식은 대각선)', () => {
  const rng = () => 0.5;
  for (const doubles of [false, true]) {
    const ball = Object.assign(P.createBall(), { x: doubles ? -0.4 : 0, y: 1.49, z: 0.3, vz: -1 });
    const shot = P.computeServe(ball, 'B', { kind: 'drive', swingX: 0.3, swingY: 0.5, quality: 1 }, doubles, rng);
    Object.assign(ball, shot.ball);
    const tables = simulate(ball, 3).filter((e) => e.type === 'table');
    assert.ok(tables[0].y > 0, '첫 바운드는 B 코트');
    assert.ok(tables[1].y < 0, '두 번째 바운드는 A 코트');
    if (doubles) {
      assert.ok(R.inRightHalf('B', tables[0].x), 'B 오른쪽 하프');
      assert.ok(R.inRightHalf('A', tables[1].x), 'A 오른쪽 하프');
    }
  }
});

test('봇끼리 경기를 끝까지 진행할 수 있다', () => {
  for (const mode of ['singles', 'doubles']) {
    const events = [];
    const room = new Room('TEST1', { mode, bestOf: 1 }, (ev, payload) => events.push([ev, payload]));
    room.addPlayer('human', '사람', null);
    for (const s of room.slots) room.addBot(s);
    // 사람 자리도 봇처럼 움직이도록 표시
    room.players.get('human').isBot = true;
    room.players.get('human').bot = { skill: 0.7, wait: 0 };
    assert.strictEqual(room.start('human'), null);
    room.stop();
    let t = 0;
    while (room.match.phase !== 'matchover' && t < 3600) {
      room.tick(1 / 60);
      t += 1 / 60;
    }
    assert.strictEqual(room.match.phase, 'matchover', mode);
    const m = room.match;
    const last = m.history[0];
    assert.ok(R.gameWinner(last.A, last.B), `${mode} ${last.A}:${last.B}`);
    const hits = events.filter(([e, p]) => e === 'fx' && p.type === 'hit').length;
    assert.ok(hits > 20, `${mode} 랠리 발생 (${hits})`);
  }
});
