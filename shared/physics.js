/*
 * 서버와 클라이언트가 함께 쓰는 탁구 물리 모듈.
 *
 * 좌표계 (단위: m, s)
 *   x : 탁구대 가로 방향 (A팀 기준 오른쪽이 +)
 *   y : 탁구대 세로 방향. A팀 코트는 y < 0, B팀 코트는 y > 0, 네트는 y = 0
 *   z : 탁구대 윗면 기준 높이 (바닥은 FLOOR_Z)
 *
 * 공은 "상수 가속도" 모델로 움직인다. 스핀(드라이브=탑스핀, 커트=백스핀, 사이드스핀=휘는 공)은
 * 타구 순간 계산된 가속도(ax, az)로 표현되므로, 목표 지점으로 정확히 떨어지는 초기 속도를
 * 해석적으로 구할 수 있고 서버/클라이언트가 같은 궤적을 재현할 수 있다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PongPhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const C = {
    TABLE_L: 2.74,
    TABLE_W: 1.525,
    HL: 1.37, // half length
    HW: 0.7625, // half width
    NET_H: 0.1525,
    NET_OVERHANG: 0.1525,
    BALL_R: 0.02,
    G: 4.5, // 게임용으로 낮춘 중력 (마우스로 따라갈 수 있는 속도)
    FLOOR_Z: -0.76,
    SERVE_HOLD_Z: 0.12,
    SERVE_TOSS_VZ: 2.6,
  };

  // 스핀 종류별 바운드 특성
  const BOUNCE = {
    top: { e: 0.8, vyMul: 1.15 }, // 드라이브: 낮고 빠르게 뻗는다
    back: { e: 0.9, vyMul: 0.7 }, // 커트: 튀어오르며 멈칫한다
    none: { e: 0.86, vyMul: 0.95 },
  };

  function bounceParams(spin) {
    return BOUNCE[spin] || BOUNCE.none;
  }

  function createBall() {
    return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, az: -C.G, spin: 'none', side: 0, rot: 0 };
  }

  function onTable(x, y) {
    return Math.abs(x) <= C.HW + C.BALL_R && Math.abs(y) <= C.HL + C.BALL_R;
  }

  function advance(b, t) {
    b.x += b.vx * t + 0.5 * b.ax * t * t;
    b.y += b.vy * t;
    b.z += b.vz * t + 0.5 * b.az * t * t;
    b.vx += b.ax * t;
    b.vz += b.az * t;
  }

  // z(t) = 0 이 되는 가장 이른 t (0 < t <= dt), 아래로 내려가는 경우만
  function timeToSurface(b, dt) {
    if (b.z <= 1e-6) {
      // 직전 스텝 끝에서 표면에 정확히(부동소수 오차로 살짝 아래) 닿은 경우 즉시 접촉 처리
      return b.z > -0.01 && b.vz < 0 ? 1e-7 : -1;
    }
    const a = 0.5 * b.az;
    const bb = b.vz;
    const c = b.z;
    let t;
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(bb) < 1e-9) return -1;
      t = -c / bb;
    } else {
      const disc = bb * bb - 4 * a * c;
      if (disc < 0) return -1;
      const s = Math.sqrt(disc);
      const t1 = (-bb - s) / (2 * a);
      const t2 = (-bb + s) / (2 * a);
      t = Infinity;
      if (t1 > 1e-6) t = t1;
      if (t2 > 1e-6 && t2 < t) t = t2;
    }
    return t > 1e-6 && t <= dt ? t : -1;
  }

  function bounce(b) {
    const p = bounceParams(b.spin);
    b.z = 0;
    b.vz = Math.abs(b.vz) * p.e;
    b.vy *= p.vyMul;
    // 스핀은 바운드에서 일부 소모된다
    if (b.spin === 'top') b.az = -(C.G + 0.8);
    else if (b.spin === 'back') b.az = -(C.G - 0.3);
    else b.az = -C.G;
  }

  /*
   * 공을 dt 만큼 진행시키고 발생한 이벤트 목록을 반환.
   * 이벤트: {type:'table', x, y} | {type:'net', touch:boolean} | {type:'floor'}
   */
  function step(b, dt) {
    const events = [];
    let remain = dt;
    let guard = 0;
    while (remain > 1e-6 && guard++ < 4) {
      const prevY = b.y;
      const prevZ = b.z;
      const tHit = timeToSurface(b, remain);
      let t = remain;
      let tableHit = false;
      if (tHit > 0) {
        // 접촉 지점이 탁구대 위인지 확인
        const probe = Object.assign({}, b);
        advance(probe, tHit);
        if (onTable(probe.x, probe.y)) {
          t = tHit;
          tableHit = true;
        }
      }
      advance(b, t);
      remain -= t;

      // 네트 통과 검사
      if ((prevY < 0 && b.y >= 0) || (prevY > 0 && b.y <= 0)) {
        const frac = Math.abs(prevY) / (Math.abs(prevY) + Math.abs(b.y) || 1);
        const zAtNet = prevZ + (b.z - prevZ) * frac;
        if (Math.abs(b.x) <= C.HW + C.NET_OVERHANG && zAtNet > -0.05) {
          if (zAtNet < C.NET_H - 0.01) {
            // 네트에 걸림: 공이 친 쪽으로 툭 떨어진다
            const sgn = prevY < 0 ? -1 : 1;
            b.y = sgn * 0.03;
            b.vy = -b.vy * 0.12;
            b.vx *= 0.3;
            b.ax = 0;
            b.vz = Math.max(b.vz, 0) * 0.2;
            b.az = -C.G;
            events.push({ type: 'net', touch: false });
            tableHit = false;
          } else if (zAtNet < C.NET_H + C.BALL_R) {
            // 네트 상단을 스치고 넘어감 (서브라면 렛)
            b.vy *= 0.65;
            b.vz = Math.abs(b.vz) * 0.4 + 0.25;
            events.push({ type: 'net', touch: true });
            tableHit = false;
          }
        }
      }

      if (tableHit) {
        bounce(b);
        events.push({ type: 'table', x: b.x, y: b.y });
      }
    }
    b.rot += dt * (b.spin === 'top' ? 30 : b.spin === 'back' ? -30 : 8);
    if (b.z < C.FLOOR_Z + C.BALL_R || Math.abs(b.y) > 7 || Math.abs(b.x) > 6) {
      events.push({ type: 'floor' });
    }
    return events;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // 정규분포 난수 (rng 주입 가능: 테스트 재현성)
  function randn(rng) {
    const r = rng || Math.random;
    let u = 0;
    let v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function qualityTier(q) {
    if (q >= 0.82) return 'fire';
    if (q >= 0.62) return 'gold';
    return 'none';
  }

  /*
   * 랠리 타구 계산.
   * team: 'A' | 'B'
   * opts: { kind:'drive'|'cut', swingX:-1..1(화면 오른쪽 +), swingY:-1..1(앞으로 +), quality:0..1 }
   * 반환: 공에 적용할 상태 + 연출 정보
   */
  function computeShot(ball, team, opts, rng) {
    const dir = team === 'A' ? 1 : -1; // 상대 코트 방향 (y)
    const xs = team === 'A' ? 1 : -1; // 플레이어 기준 오른쪽 → 월드 x 부호
    const kind = opts.kind === 'cut' ? 'cut' : 'drive';
    const q = clamp(Number(opts.quality) || 0, 0, 1);
    const side = clamp(Number(opts.swingX) || 0, -1, 1);
    const fwd = clamp(Number(opts.swingY) || 0, -1, 1);
    const tier = qualityTier(q);

    const power = clamp(0.35 + 0.65 * Math.max(0, fwd), 0.3, 1);
    let T;
    let extraAz;
    let depth;
    if (kind === 'drive') {
      T = 1.05 - 0.45 * power;
      extraAz = 2.0 + 1.8 * power;
      depth = 0.5 + 0.7 * power;
    } else {
      T = 1.2 - 0.2 * power;
      extraAz = -1.4;
      depth = 0.4 + 0.55 * power;
    }
    if (tier === 'fire') T *= 0.75;
    else if (tier === 'gold') T *= 0.88;
    // 필살기: 공이 높으면 슈퍼 스매시(납작하고 매우 빠름), 낮으면 슈퍼 드라이브(크게 휘며 뚝 떨어짐)
    let specialKind = null;
    if (opts.special) {
      specialKind = ball.z > 0.28 ? 'smash' : 'drive';
      if (specialKind === 'smash') {
        T = 0.42;
        extraAz = 1.2;
      } else {
        T = 0.5;
        extraAz = 6.5;
      }
    }

    const x0 = ball.x;
    const y0 = ball.y;
    const z0 = ball.z;
    const ballXp = x0 * xs;
    let aimP = clamp(-ballXp * 0.3 + side * 0.5, -0.62, 0.62);
    let depthP = depth;
    // 마우스로 조준한 지점(상대 코트 위 월드 좌표)이 있으면 그곳을 노린다
    if (Number.isFinite(opts.aimX) && Number.isFinite(opts.aimY)) {
      aimP = clamp(opts.aimX * xs, -0.66, 0.66);
      depthP = clamp(opts.aimY * dir, kind === 'cut' ? 0.3 : 0.4, 1.28);
    }

    // 타이밍 오차 → 목표 지점 흔들림 (실수하면 아웃/네트)
    const err = 1 - q;
    aimP += randn(rng) * err * 0.32;
    depthP += randn(rng) * err * 0.4;
    if (tier === 'fire') {
      aimP = clamp(aimP, -0.68, 0.68);
      depthP = clamp(depthP, 0.6, 1.25);
    }

    const tx = aimP * xs;
    const ty = depthP * dir;
    // 사이드 스핀: 손가락/마우스를 곡선으로 움직이면(curl) 그 방향으로 휘어 들어간다
    const curl = Number.isFinite(Number(opts.curl)) && opts.curl !== undefined ? clamp(Number(opts.curl), -1, 1) : side;
    const ax = curl * (opts.special ? 2.8 : 2.3) * xs;
    const az = -(C.G + extraAz);

    let v;
    const solve = () => ({
      vx: (tx - x0) / T - 0.5 * ax * T,
      vy: (ty - y0) / T,
      vz: (0 - z0) / T - 0.5 * az * T,
    });
    v = solve();
    // 네트/끝선 클리어런스 보정 (타이밍이 아주 나쁘면 보정 없이 네트)
    const fix = q >= 0.25 || (rng || Math.random)() < 0.5;
    for (let i = 0; i < 14 && fix; i++) {
      const tn = (0 - y0) / v.vy;
      const zn = z0 + v.vz * tn + 0.5 * az * tn * tn;
      const te = (-C.HL * dir - y0) / v.vy;
      const ze = te > 0 ? z0 + v.vz * te + 0.5 * az * te * te : 1;
      if (zn > C.NET_H + 0.05 && ze > 0.03) break;
      T += 0.06;
      v = solve();
    }

    return {
      ball: {
        vx: v.vx,
        vy: v.vy,
        vz: v.vz,
        ax,
        az,
        spin: kind === 'drive' || specialKind ? 'top' : 'back',
        side: curl,
        special: !!opts.special,
      },
      kind: specialKind || kind,
      special: specialKind,
      tier: opts.special ? 'fire' : tier,
      quality: q,
      power,
    };
  }

  /*
   * 서브 계산: 자기 코트에 한 번, 상대 코트에 한 번 바운드하도록 궤적을 푼다.
   * doubles 이면 서버 오른쪽 하프 → 리시버 오른쪽 하프(대각선) 규칙을 따른다.
   */
  function computeServe(ball, team, opts, doubles, rng) {
    const dir = team === 'A' ? 1 : -1;
    const xs = team === 'A' ? 1 : -1;
    const kind = opts.kind === 'cut' ? 'cut' : 'drive';
    const spin = kind === 'drive' ? 'top' : 'back';
    const q = clamp(Number(opts.quality) || 0, 0, 1);
    const side = clamp(Number(opts.swingX) || 0, -1, 1);
    const fwd = clamp(Number(opts.swingY) || 0, -1, 1);
    const tier = qualityTier(q);
    const power = clamp(0.4 + 0.6 * Math.max(0, fwd), 0.3, 1);

    const x0 = ball.x;
    const y0 = ball.y;
    const z0 = Math.max(ball.z, 0.05);
    const p = bounceParams(spin);
    const a2 = spin === 'top' ? C.G + 0.8 : C.G - 0.3; // 바운드 후 수직 가속도 (bounce() 와 동일)

    // 목표(상대 코트 두 번째 바운드) — 플레이어 기준 좌표
    let aimP = doubles ? -clamp(0.3 + Math.abs(side) * 0.3, 0.15, 0.6) : clamp(side * 0.55, -0.62, 0.62);
    let depthP = 0.5 + 0.7 * power;
    if (Number.isFinite(opts.aimX) && Number.isFinite(opts.aimY)) {
      aimP = clamp(opts.aimX * xs, -0.62, 0.62);
      if (doubles) aimP = Math.min(aimP, -0.12); // 복식: 상대 오른쪽 하프(대각선)
      depthP = clamp(opts.aimY * dir, 0.45, 1.25);
    }
    const err = 1 - q;
    aimP += randn(rng) * err * 0.2;
    depthP += randn(rng) * err * 0.3;
    if (doubles) aimP = Math.min(aimP, 0.1);
    const ty = depthP * dir;

    // 주어진 첫 바운드 지점(y1)과 비행시간 T1 으로 궤적 계산
    const plan = (y1, T1) => {
      const vy = (y1 - y0) / T1;
      const vz0 = (0.5 * C.G * T1 * T1 - z0) / T1;
      const vz1 = (C.G * T1 - vz0) * p.e;
      const T2 = (2 * vz1) / a2;
      const land = y1 + vy * p.vyMul * T2;
      const tN = (0 - y1) / (vy * p.vyMul);
      const zNet = vz1 * tN - 0.5 * a2 * tN * tN;
      return { vy, vz0, T1, T2, land, zNet };
    };

    // 첫 바운드 지점(s1)과 비행시간(T1)을 격자 탐색:
    // 네트를 안전하게 넘고, 상대 코트 안에서 목표 깊이에 가장 가깝게 떨어지는 궤적 선택
    const wantNet = tier === 'fire' ? C.NET_H + 0.07 : C.NET_H + 0.11;
    let best = null;
    for (let s1 = 0.2; s1 <= 1.16; s1 += 0.04) {
      const y1 = -dir * s1;
      for (let T1 = 0.12; T1 <= 1.0; T1 += 0.01) {
        const c = plan(y1, T1);
        if (c.zNet < C.NET_H + 0.05) continue;
        const landP = c.land * dir;
        if (landP < 0.15 || landP > C.HL - 0.04) continue;
        const score = Math.abs(c.land - ty) * 3 + Math.abs(c.zNet - wantNet);
        if (!best || score < best.score) best = Object.assign(c, { score, y1 });
      }
    }
    if (!best) best = plan(-dir * 0.6, 0.35); // 해가 없으면 기본 궤적 (실패 서브가 될 수 있다)
    // 타이밍이 나쁘면 목표와 관계없이 깊이 오차를 더해 아웃/짧은 서브가 나올 수 있다
    if (err > 0.3) {
      const k = 1 + randn(rng) * (err - 0.3) * 0.25;
      best.vy *= k;
    }
    const Ttot = best.T1 + best.T2;
    const ax = doubles ? 0 : side * 0.8 * xs;
    let tx = aimP * xs;
    if (doubles) {
      // 첫 바운드가 서버 오른쪽 하프에 남도록 보정 (x 는 직선 이동)
      const f = best.T1 / Ttot;
      const x0p = x0 * xs;
      const minTxp = x0p - (x0p - 0.05) / f;
      tx = Math.max(aimP, minTxp) * xs;
    }
    const vx = (tx - x0) / Ttot - 0.5 * ax * Ttot;
    return {
      ball: { vx, vy: best.vy, vz: best.vz0, ax, az: -C.G, spin, side, special: false },
      kind,
      tier,
      quality: q,
      power,
    };
  }

  /*
   * 이상적인 타격 순간 예측.
   *  - 랠리: 공이 team 쪽 코트에 바운드한 뒤 가장 높이 솟은 순간(정점)
   *  - 토스(서브): 토스한 공이 떨어지면서 높이 0.3m 를 지나는 순간
   * 반환: {t(지금부터 초), x, y, z, bounceT} 또는 null
   */
  // mode: 'incoming'(아직 내 코트 바운드 전) | 'bounced'(이미 바운드함) | 'toss'(서브 토스)
  function predictIdeal(ball, team, mode, maxT) {
    const b = Object.assign({}, ball);
    const dt = 1 / 120;
    const limit = maxT || 3;
    const toss = mode === 'toss';
    let bounced = mode !== 'incoming';
    let bounceT = bounced ? 0 : -1;
    if (mode === 'bounced' && b.vz <= 0) return { t: 0, x: b.x, y: b.y, z: b.z, bounceT: 0 };
    for (let t = 0; t < limit; t += dt) {
      const pz = b.z;
      const evs = step(b, dt);
      for (const e of evs) {
        if (e.type === 'floor') return null;
        if (e.type === 'table' && !toss && (e.y < 0 ? 'A' : 'B') === team) {
          bounced = true;
          bounceT = t + dt;
        }
      }
      if (!bounced) continue;
      if (toss) {
        if (b.vz < 0 && pz >= 0.3 && b.z <= 0.3) return { t: t + dt, x: b.x, y: b.y, z: b.z, bounceT };
      } else if (b.vz <= 0 && t + dt > bounceT) {
        return { t: t + dt, x: b.x, y: b.y, z: b.z, bounceT };
      }
    }
    return null;
  }

  // 클릭 시각과 이상적 순간의 차이(초) → 타이밍 품질 0..1
  const TIMING_WINDOW = 0.3;
  const SPECIAL_WINDOW = 0.16; // 필살기 공은 받아치기 어렵다
  function timingQuality(diff, window) {
    return clamp(1 - Math.abs(diff) / (window || TIMING_WINDOW), 0, 1);
  }

  return { C, createBall, step, bounce, computeShot, computeServe, qualityTier, clamp, onTable, predictIdeal, timingQuality, TIMING_WINDOW, SPECIAL_WINDOW };
});
