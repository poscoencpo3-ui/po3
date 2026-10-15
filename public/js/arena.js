/*
 * 올림픽 경기장 스타일 렌더러 (Canvas 2D + 간단한 원근 투영)
 * - 배경: 관중석(애니메이션 관중), LED 광고판, 조명, 빨간 코트 바닥
 * - 가운데 파란 탁구대 + 네트
 * - 큰머리 캐리커처 선수, 공 궤적/드라이브 잔상/황금공/불꽃공 효과
 */
(function () {
  const { C } = window.PongPhysics;
  const TEAM_COLOR = { A: '#e63946', B: '#1d7bf2' };
  const TEAM_DARK = { A: '#9d1c26', B: '#0f4fa8' };

  function v(x, y, z) {
    return { x, y, z };
  }
  function sub(a, b) {
    return v(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  function cross(a, b) {
    return v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }
  function norm(a) {
    const l = Math.hypot(a.x, a.y, a.z) || 1;
    return v(a.x / l, a.y / l, a.z / l);
  }

  // 시드 고정 난수 (관중 배치가 매번 같도록)
  function mulberry(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Arena {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.view = 'A';
      this.trail = [];
      this.particles = [];
      this.effects = [];
      this.texts = [];
      this.shake = 0;
      this.cheer = 0;
      this.cheerSide = null;
      this.time = 0;
      this.resize();
    }

    setView(team) {
      if (team !== this.view) {
        this.view = team;
        this.buildStatic();
      }
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.dpr = dpr;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      this.eye = v(0, -5.3, 3.3);
      const target = v(0, 1.05, -0.45);
      this.fwd = norm(sub(target, this.eye));
      this.right = norm(cross(this.fwd, v(0, 0, 1)));
      this.up = cross(this.right, this.fwd);
      const fy = h / 2 / Math.tan((45 * Math.PI) / 360);
      const fx = w / 2 / Math.tan((60 * Math.PI) / 360);
      this.f = Math.min(fy, fx);
      this.cy = h * 0.47;
      this.buildStatic();
    }

    // 월드 → 화면. B팀 화면은 탁구대를 180도 돌려서 본다.
    project(x, y, z) {
      if (this.view === 'B') {
        x = -x;
        y = -y;
      }
      const d = v(x - this.eye.x, y - this.eye.y, z - this.eye.z);
      const cz = dot(d, this.fwd);
      if (cz < 0.05) return null;
      const s = this.f / cz;
      return { x: this.w / 2 + dot(d, this.right) * s, y: this.cy - dot(d, this.up) * s, s };
    }

    // 화면 → 높이 z 평면 위의 월드 좌표
    unproject(sx, sy, z) {
      const dx = (sx - this.w / 2) / this.f;
      const dy = -(sy - this.cy) / this.f;
      const dir = v(
        this.fwd.x + this.right.x * dx + this.up.x * dy,
        this.fwd.y + this.right.y * dx + this.up.y * dy,
        this.fwd.z + this.right.z * dx + this.up.z * dy
      );
      let t = (z - this.eye.z) / dir.z;
      if (!(t > 0) || t > 30) t = 6;
      let x = this.eye.x + dir.x * t;
      let y = this.eye.y + dir.y * t;
      if (this.view === 'B') {
        x = -x;
        y = -y;
      }
      return { x, y, z };
    }

    poly(ctx, pts, fill, stroke, lw) {
      const ps = pts.map((p) => this.project(p[0], p[1], p[2]));
      if (ps.some((p) => !p)) return;
      ctx.beginPath();
      ps.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.lineWidth = lw || 1;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }

    /* ---------------- 정적 배경 (경기장) ---------------- */
    buildStatic() {
      const { w, h, dpr } = this;
      const bg = document.createElement('canvas');
      bg.width = Math.round(w * dpr);
      bg.height = Math.round(h * dpr);
      const ctx = bg.getContext('2d');
      ctx.scale(dpr, dpr);

      // 경기장 천장/벽
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#05070f');
      g.addColorStop(0.45, '#111a33');
      g.addColorStop(1, '#0b0f1e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // 관중석 계단 (뒤쪽, 양옆)
      const F = C.FLOOR_Z;
      const tiers = 10;
      for (let i = tiers - 1; i >= 0; i--) {
        const y0 = 6.2 + i * 0.75;
        const z0 = F + 0.6 + i * 0.55;
        const shade = 22 + i * 3;
        this.poly(ctx, [[-14, y0, z0], [14, y0, z0], [14, y0 + 0.75, z0 + 0.55], [-14, y0 + 0.75, z0 + 0.55]], `rgb(${shade},${shade + 6},${shade + 22})`);
        this.poly(ctx, [[-14, y0, z0 - 0.55], [14, y0, z0 - 0.55], [14, y0, z0], [-14, y0, z0]], `rgb(${shade - 8},${shade - 4},${shade + 10})`);
      }
      for (const sgn of [-1, 1]) {
        for (let i = tiers - 1; i >= 0; i--) {
          const x0 = sgn * (4.6 + i * 0.75);
          const z0 = F + 0.6 + i * 0.55;
          const shade = 20 + i * 3;
          this.poly(ctx, [[x0, -2, z0], [x0, 6.2, z0], [x0 + sgn * 0.75, 6.2 + i * 0.75, z0 + 0.55], [x0 + sgn * 0.75, -2, z0 + 0.55]], `rgb(${shade},${shade + 5},${shade + 20})`);
        }
      }

      // 천장 조명 + 만국기
      const light = (x, y) => {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, 70);
        rg.addColorStop(0, 'rgba(255,255,240,0.95)');
        rg.addColorStop(0.15, 'rgba(255,250,220,0.5)');
        rg.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - 70, y - 70, 140, 140);
      };
      for (let i = 0; i < 7; i++) light((w * (i + 0.5)) / 7, h * 0.035);
      const flagColors = ['#0081c8', '#fcb131', '#000000', '#00a651', '#ee334e', '#ffffff'];
      ctx.lineWidth = 1;
      for (let row = 0; row < 2; row++) {
        const yb = h * (0.075 + row * 0.04);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(0, yb);
        ctx.quadraticCurveTo(w / 2, yb + 30, w, yb);
        ctx.stroke();
        for (let i = 0; i < 40; i++) {
          const t = (i + 0.5) / 40;
          const x = t * w;
          const y = yb + 4 * 30 * t * (1 - t) * 0.5 * 2;
          ctx.fillStyle = flagColors[(i + row * 3) % flagColors.length];
          ctx.beginPath();
          ctx.moveTo(x - 6, y);
          ctx.lineTo(x + 6, y);
          ctx.lineTo(x, y + 13);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 바닥: 바깥은 짙은 남색, 코트는 빨간 경기용 매트
      this.poly(ctx, [[-14, -3.2, F], [14, -3.2, F], [14, 14, F], [-14, 14, F]], '#14182c');
      this.poly(ctx, [[-4.2, -3.2, F], [4.2, -3.2, F], [4.2, 5.6, F], [-4.2, 5.6, F]], '#a3262e');
      // 코트 매트 결
      for (let i = -3; i <= 5; i += 1) this.poly(ctx, [[-4.2, i, F], [4.2, i, F]], null, 'rgba(0,0,0,0.12)', 1);

      // 펜스(광고판) — 뒤쪽 + 양옆
      const boardH = 0.72;
      const boards = [];
      for (let i = 0; i < 6; i++) {
        const x0 = -4.2 + i * 1.4;
        boards.push([[x0, 5.6, F], [x0 + 1.4, 5.6, F], [x0 + 1.4, 5.6, F + boardH], [x0, 5.6, F + boardH], i]);
      }
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const y0 = -1.6 + i * 1.2;
          boards.push([[sgn * 4.2, y0, F], [sgn * 4.2, y0 + 1.2, F], [sgn * 4.2, y0 + 1.2, F + boardH], [sgn * 4.2, y0, F + boardH], i + 2]);
        }
      }
      const slogans = ['PING PONG ARENA', 'SMASH!', '2026 GAMES', 'TOPSPIN', 'FAIR PLAY', 'GO!'];
      const boardColors = ['#0b3d91', '#ffd60a', '#06d6a0', '#ef476f', '#118ab2', '#ffffff'];
      for (const b of boards) {
        const col = boardColors[b[4] % boardColors.length];
        this.poly(ctx, b.slice(0, 4), col, 'rgba(0,0,0,0.5)', 1);
        const c0 = this.project((b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, F + boardH / 2);
        if (c0) {
          ctx.fillStyle = col === '#ffffff' || col === '#ffd60a' || col === '#06d6a0' ? '#10142a' : '#ffffff';
          ctx.font = `900 ${Math.max(7, Math.min(c0.s * 0.2, 26))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(slogans[b[4] % slogans.length], c0.x, c0.y);
        }
      }

      // 탁구대 위 스포트라이트
      const tc = this.project(0, 0, 0);
      if (tc) {
        const rg = ctx.createRadialGradient(tc.x, tc.y, 0, tc.x, tc.y, w * 0.45);
        rg.addColorStop(0, 'rgba(255,255,230,0.18)');
        rg.addColorStop(1, 'rgba(255,255,230,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }

      // 심판석 (오른쪽, 네트 옆)
      const ux = this.view === 'A' ? 2.4 : -2.4;
      const seat = this.project(ux, 0, F + 0.75);
      const base = this.project(ux, 0, F);
      if (seat && base) {
        const s = seat.s;
        ctx.strokeStyle = '#ced4da';
        ctx.lineWidth = Math.max(2, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(seat.x - s * 0.18, seat.y);
        ctx.lineTo(base.x - s * 0.22, base.y);
        ctx.moveTo(seat.x + s * 0.18, seat.y);
        ctx.lineTo(base.x + s * 0.22, base.y);
        ctx.stroke();
        ctx.fillStyle = '#495057';
        ctx.fillRect(seat.x - s * 0.22, seat.y - s * 0.04, s * 0.44, s * 0.06);
        ctx.fillStyle = '#1d3557';
        ctx.fillRect(seat.x - s * 0.16, seat.y - s * 0.5, s * 0.32, s * 0.48);
        ctx.fillStyle = '#f1faee';
        ctx.fillRect(seat.x - s * 0.04, seat.y - s * 0.5, s * 0.08, s * 0.2);
        ctx.fillStyle = '#f1c27d';
        ctx.beginPath();
        ctx.arc(seat.x, seat.y - s * 0.62, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2b2118';
        ctx.beginPath();
        ctx.arc(seat.x, seat.y - s * 0.66, s * 0.12, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      this.bg = bg;

      this.buildCrowd();
      this.buildTable();
    }

    buildCrowd() {
      const rnd = mulberry(7);
      const F = C.FLOOR_Z;
      const people = [];
      const shirt = ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#ffb703', '#fb8500', '#8338ec', '#06d6a0', '#ff006e', '#3a86ff', '#ffffff', '#222'];
      const skin = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
      const tiers = 10;
      for (let i = 0; i < tiers; i++) {
        const y = 6.2 + i * 0.75 + 0.35;
        const z = F + 0.6 + i * 0.55;
        for (let x = -13.5; x <= 13.5; x += 0.55 + rnd() * 0.15) {
          if (rnd() < 0.08) continue;
          people.push({ x: x + rnd() * 0.1, y, z, team: x < 0 ? 'A' : 'B' });
        }
      }
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < tiers; i++) {
          const x = sgn * (4.6 + i * 0.75 + 0.35);
          const z = F + 0.6 + i * 0.55;
          for (let y = -1.6; y <= 6.2; y += 0.55 + rnd() * 0.15) {
            if (rnd() < 0.08) continue;
            people.push({ x, y, z, team: sgn < 0 ? 'A' : 'B' });
          }
        }
      }
      this.crowd = [];
      for (const p of people) {
        const pr = this.project(p.x, p.y, p.z);
        if (!pr || pr.x < -40 || pr.x > this.w + 40 || pr.y < -40) continue;
        const s = pr.s;
        this.crowd.push({
          x: pr.x,
          y: pr.y,
          s,
          shirt: shirt[Math.floor(rnd() * shirt.length)],
          skin: skin[Math.floor(rnd() * skin.length)],
          hair: rnd() < 0.7 ? '#2b2118' : '#e9c46a',
          phase: rnd() * Math.PI * 2,
          speed: 2 + rnd() * 3,
          flag: rnd() < 0.08 ? (rnd() < 0.5 ? TEAM_COLOR.A : TEAM_COLOR.B) : null,
          sign: rnd() < 0.03,
          team: this.view === 'A' ? p.team : p.team === 'A' ? 'B' : 'A',
        });
      }
      // 멀리 있는 사람부터 그린다
      this.crowd.sort((a, b) => a.s - b.s);
    }

    buildTable() {
      const { w, h, dpr } = this;
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const { HL, HW, FLOOR_Z: F } = C;
      const th = 0.03;

      // 그림자
      this.poly(ctx, [[-HW - 0.1, -HL - 0.1, F], [HW + 0.1, -HL - 0.1, F], [HW + 0.1, HL + 0.1, F], [-HW - 0.1, HL + 0.1, F]], 'rgba(0,0,0,0.35)');
      // 다리
      const legs = [[-HW + 0.15, -HL + 0.25], [HW - 0.15, -HL + 0.25], [-HW + 0.15, HL - 0.25], [HW - 0.15, HL - 0.25]];
      for (const [lx, ly] of legs) {
        const a = this.project(lx, ly, -th);
        const b = this.project(lx, ly, F);
        if (a && b) {
          ctx.strokeStyle = '#1b1f2e';
          ctx.lineWidth = Math.max(2, a.s * 0.05);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      // 옆면
      this.poly(ctx, [[-HW, -HL, 0], [HW, -HL, 0], [HW, -HL, -th], [-HW, -HL, -th]], '#0d2a5c');
      this.poly(ctx, [[HW, -HL, 0], [HW, HL, 0], [HW, HL, -th], [HW, -HL, -th]], '#0d2a5c');
      this.poly(ctx, [[-HW, -HL, 0], [-HW, HL, 0], [-HW, HL, -th], [-HW, -HL, -th]], '#0d2a5c');
      // 윗면
      const tg = this.project(0, -HL, 0);
      const tg2 = this.project(0, HL, 0);
      let fill = '#1d4f9e';
      if (tg && tg2) {
        fill = ctx.createLinearGradient(0, tg.y, 0, tg2.y);
        fill.addColorStop(0, '#2563c4');
        fill.addColorStop(1, '#173f84');
      }
      this.poly(ctx, [[-HW, -HL, 0], [HW, -HL, 0], [HW, HL, 0], [-HW, HL, 0]], fill);
      // 흰 라인
      const lw = 0.02;
      const white = '#f8f9fa';
      this.poly(ctx, [[-HW, -HL, 0], [HW, -HL, 0], [HW, -HL + lw, 0], [-HW, -HL + lw, 0]], white);
      this.poly(ctx, [[-HW, HL - lw, 0], [HW, HL - lw, 0], [HW, HL, 0], [-HW, HL, 0]], white);
      this.poly(ctx, [[-HW, -HL, 0], [-HW + lw, -HL, 0], [-HW + lw, HL, 0], [-HW, HL, 0]], white);
      this.poly(ctx, [[HW - lw, -HL, 0], [HW, -HL, 0], [HW, HL, 0], [HW - lw, HL, 0]], white);
      this.poly(ctx, [[-0.0015, -HL, 0], [0.0015, -HL, 0], [0.0015, HL, 0], [-0.0015, HL, 0]], 'rgba(255,255,255,0.85)');
      // 네트
      const NO = HW + C.NET_OVERHANG;
      const NH = C.NET_H;
      this.poly(ctx, [[-NO, 0, 0], [NO, 0, 0], [NO, 0, NH], [-NO, 0, NH]], 'rgba(20,20,30,0.55)');
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.7;
      for (let x = -NO; x <= NO; x += 0.04) {
        const a = this.project(x, 0, 0);
        const b = this.project(x, 0, NH);
        if (a && b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (let z = 0; z <= NH; z += 0.03) this.poly(ctx, [[-NO, 0, z], [NO, 0, z]], null, 'rgba(255,255,255,0.18)', 0.7);
      this.poly(ctx, [[-NO, 0, NH - 0.012], [NO, 0, NH - 0.012], [NO, 0, NH], [-NO, 0, NH]], '#fff');
      for (const sx of [-NO, NO]) this.poly(ctx, [[sx - 0.01, 0, -0.02], [sx + 0.01, 0, -0.02], [sx + 0.01, 0, NH + 0.01], [sx - 0.01, 0, NH + 0.01]], '#adb5bd');
      this.table = cv;
    }

    /* ---------------- 효과 ---------------- */
    addText(text, color, big, x, y) {
      this.texts.push({ text, color: color || '#fff', big: !!big, t: 0, x: x == null ? this.w / 2 : x, y: y == null ? this.h * 0.38 : y });
    }

    impact(sx, sy, tier) {
      this.effects.push({ type: 'ring', x: sx, y: sy, t: 0, tier });
      const n = tier === 'fire' ? 40 : tier === 'gold' ? 22 : 8;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 80 + Math.random() * (tier === 'fire' ? 420 : 220);
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.35 + Math.random() * 0.4,
          age: 0,
          kind: tier === 'none' ? 'spark-white' : tier === 'gold' ? 'spark-gold' : 'fire',
          r: 2 + Math.random() * 4,
        });
      }
      if (tier === 'fire') this.shake = 0.35;
    }

    bounceFx(x, y) {
      const p = this.project(x, y, 0);
      if (p) this.effects.push({ type: 'ripple', x: p.x, y: p.y, s: p.s, t: 0 });
    }

    celebrate(team) {
      this.cheer = 2.2;
      this.cheerSide = team;
    }

    /* ---------------- 프레임 그리기 ---------------- */
    draw(frame, dt) {
      const ctx = this.ctx;
      const { w, h, dpr } = this;
      this.time += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let sx = 0;
      let sy = 0;
      if (this.shake > 0) {
        this.shake -= dt;
        const k = Math.max(0, this.shake) * 22;
        sx = (Math.random() - 0.5) * k;
        sy = (Math.random() - 0.5) * k;
      }
      ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
      ctx.drawImage(this.bg, 0, 0, w, h);
      this.drawCrowd(ctx, dt);

      const players = frame.players || [];
      const viewTeam = this.view;
      const far = players.filter((p) => p.slot[0] !== viewTeam);
      const near = players.filter((p) => p.slot[0] === viewTeam);

      for (const p of far) this.drawPlayer(ctx, p, frame, false);
      ctx.drawImage(this.table, 0, 0, w, h);
      if (frame.ball) this.drawBall(ctx, frame.ball, frame.fx, dt);
      if (frame.aim) this.drawAim(ctx, frame.aim);
      for (const p of near) this.drawPlayer(ctx, p, frame, true);
      if (frame.timing && frame.ball) this.drawTiming(ctx, frame.timing);

      this.drawEffects(ctx, dt);
      if (frame.cursor) this.drawCrosshair(ctx, frame.cursor);
      this.drawTexts(ctx, dt);
    }

    drawCrowd(ctx, dt) {
      if (this.cheer > 0) this.cheer -= dt;
      const t = this.time;
      const cheering = this.cheer > 0;
      for (const c of this.crowd) {
        const excited = cheering && (!this.cheerSide || c.team === this.cheerSide || Math.random() < 0.002);
        const amp = excited ? 0.28 : 0.03;
        const bob = Math.abs(Math.sin(t * c.speed * (excited ? 2.2 : 0.6) + c.phase)) * amp * c.s;
        const s = c.s;
        const y = c.y - bob;
        ctx.fillStyle = c.shirt;
        ctx.fillRect(c.x - s * 0.17, y - s * 0.34, s * 0.34, s * 0.36);
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(c.x, y - s * 0.46, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.arc(c.x, y - s * 0.5, s * 0.12, Math.PI, Math.PI * 2);
        ctx.fill();
        if (excited) {
          // 만세!
          ctx.strokeStyle = c.skin;
          ctx.lineWidth = Math.max(1, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(c.x - s * 0.15, y - s * 0.3);
          ctx.lineTo(c.x - s * 0.25, y - s * 0.7);
          ctx.moveTo(c.x + s * 0.15, y - s * 0.3);
          ctx.lineTo(c.x + s * 0.25, y - s * 0.7);
          ctx.stroke();
        }
        if (c.flag) {
          const wave = Math.sin(t * 3 + c.phase) * s * 0.08;
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x + s * 0.18, y - s * 0.2);
          ctx.lineTo(c.x + s * 0.18, y - s * 0.95);
          ctx.stroke();
          ctx.fillStyle = c.flag;
          ctx.fillRect(c.x + s * 0.18, y - s * 0.95 + wave, s * 0.4, s * 0.25);
        }
        if (c.sign) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(c.x - s * 0.35, y - s * 1.0, s * 0.7, s * 0.3);
          ctx.fillStyle = '#d00000';
          ctx.font = `900 ${Math.max(6, s * 0.17)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('NICE!', c.x, y - s * 0.85);
        }
      }
    }

    drawPlayer(ctx, p, frame, near) {
      const team = p.slot[0];
      const pad = p.paddle || { x: 0, y: team === 'A' ? -1.8 : 1.8, z: 0.2 };
      const sgn = team === 'A' ? -1 : 1;
      // 몸은 패들보다 살짝 뒤/바깥쪽에 선다
      const bodyY = sgn * Math.max(C.HL + (near ? 0.8 : 0.45), Math.abs(pad.y) + (near ? 0.55 : 0.35));
      const xs = team === 'A' ? 1 : -1;
      const bodyX = pad.x - (near ? 0.5 : 0.3) * xs;
      const foot = this.project(bodyX, bodyY, C.FLOOR_Z);
      const hip = this.project(bodyX, bodyY, -0.05);
      const shoulder = this.project(bodyX, bodyY, 0.35);
      const headC = this.project(bodyX, bodyY, 0.72);
      const hand = this.project(pad.x, pad.y, pad.z);
      if (!foot || !hip || !shoulder || !headC) return;
      const s = shoulder.s;
      ctx.save();
      if (near) ctx.globalAlpha = 0.5;

      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y, s * 0.35, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // 다리 (짧고 귀엽게)
      ctx.strokeStyle = '#f1c27d';
      ctx.lineWidth = s * 0.09;
      ctx.lineCap = 'round';
      const step = Math.sin(this.time * 8 + (team === 'A' ? 0 : 1)) * s * 0.04;
      ctx.beginPath();
      ctx.moveTo(hip.x - s * 0.1, hip.y);
      ctx.lineTo(foot.x - s * 0.12 + step, foot.y);
      ctx.moveTo(hip.x + s * 0.1, hip.y);
      ctx.lineTo(foot.x + s * 0.12 - step, foot.y);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(foot.x - s * 0.13 + step, foot.y, s * 0.09, s * 0.05, 0, 0, Math.PI * 2);
      ctx.ellipse(foot.x + s * 0.13 - step, foot.y, s * 0.09, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // 반바지
      ctx.fillStyle = '#1b1b2f';
      ctx.fillRect(hip.x - s * 0.2, hip.y - s * 0.1, s * 0.4, s * 0.18);
      // 유니폼
      ctx.fillStyle = TEAM_COLOR[team];
      ctx.beginPath();
      ctx.moveTo(shoulder.x - s * 0.26, shoulder.y);
      ctx.lineTo(shoulder.x + s * 0.26, shoulder.y);
      ctx.lineTo(hip.x + s * 0.21, hip.y - s * 0.08);
      ctx.lineTo(hip.x - s * 0.21, hip.y - s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.min(s * 0.2, 40)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.slot[1], (shoulder.x + hip.x) / 2, (shoulder.y + hip.y) / 2);
      // 팔 → 라켓
      if (hand) {
        ctx.strokeStyle = '#f1c27d';
        ctx.lineWidth = s * 0.08;
        const sx0 = shoulder.x + (hand.x > shoulder.x ? 1 : -1) * s * 0.22;
        ctx.beginPath();
        ctx.moveTo(sx0, shoulder.y + s * 0.03);
        const mx = (sx0 + hand.x) / 2;
        const my = Math.max(shoulder.y, hand.y) + s * 0.08;
        ctx.quadraticCurveTo(mx, my, hand.x, hand.y);
        ctx.stroke();
        this.drawPaddle(ctx, hand.x, hand.y, hand.s * 0.15, p.swing || 0);
      }
      // 머리 (캐리커처)
      const hr = s * (near ? 0.27 : 0.36);
      if (p.img && p.img.complete && p.img.naturalWidth) {
        const bob = Math.sin(this.time * 5 + p.slot.charCodeAt(1)) * s * 0.02;
        ctx.drawImage(p.img, headC.x - hr, headC.y - hr * 1.15 + bob, hr * 2, hr * 2);
      } else {
        ctx.fillStyle = '#f1c27d';
        ctx.beginPath();
        ctx.arc(headC.x, headC.y - hr * 0.15, hr, 0, Math.PI * 2);
        ctx.fill();
      }
      // 이름표
      ctx.globalAlpha = 1;
      ctx.font = `700 ${Math.max(11, Math.min(s * 0.11, 17))}px system-ui`;
      const label = (p.isTurn ? '▶ ' : '') + p.name;
      const tw = ctx.measureText(label).width + 12;
      const ly = headC.y - hr * 1.25 - 12;
      ctx.fillStyle = p.isTurn ? 'rgba(255,214,10,0.95)' : 'rgba(0,0,0,0.55)';
      ctx.fillRect(headC.x - tw / 2, ly - 9, tw, 18);
      ctx.fillStyle = p.isTurn ? '#111' : '#fff';
      ctx.fillText(label, headC.x, ly);
      ctx.restore();
    }

    drawPaddle(ctx, x, y, r, swing) {
      r = Math.max(6, r);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5 + swing * 0.8);
      ctx.fillStyle = '#8d5a2b';
      ctx.fillRect(-r * 0.18, r * 0.75, r * 0.36, r * 0.9);
      ctx.fillStyle = '#d62828';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    drawBall(ctx, b, fx, dt) {
      const p = this.project(b.x, b.y, b.z);
      if (!p) return;
      // 그림자
      const overTable = Math.abs(b.x) <= C.HW && Math.abs(b.y) <= C.HL && b.z >= -0.02;
      const shZ = overTable ? 0.001 : C.FLOOR_Z;
      const sh = this.project(b.x, b.y, shZ);
      if (sh) {
        const hgt = b.z - shZ;
        ctx.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.45 - hgt * 0.4)})`;
        ctx.beginPath();
        ctx.ellipse(sh.x, sh.y, Math.max(2, sh.s * 0.028), Math.max(1, sh.s * 0.012), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 궤적 잔상
      const speed = Math.hypot(b.vx, b.vy, b.vz);
      this.trail.push({ x: p.x, y: p.y, r: p.s * C.BALL_R * 1.5 });
      const maxTrail = fx === 'fire' ? 22 : fx === 'gold' ? 16 : speed > 2.5 ? 10 : 5;
      while (this.trail.length > maxTrail) this.trail.shift();
      const n = this.trail.length;
      for (let i = 1; i < n; i++) {
        const a = this.trail[i - 1];
        const c = this.trail[i];
        const k = i / n;
        ctx.lineCap = 'round';
        if (fx === 'fire') {
          ctx.strokeStyle = `rgba(255,${Math.round(80 + 140 * k)},0,${k * 0.85})`;
          ctx.lineWidth = Math.max(2, c.r * 2.4 * k);
        } else if (fx === 'gold') {
          ctx.strokeStyle = `rgba(255,214,10,${k * 0.7})`;
          ctx.lineWidth = Math.max(2, c.r * 1.8 * k);
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${k * 0.35})`;
          ctx.lineWidth = Math.max(1, c.r * 1.2 * k);
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }

      const r = Math.max(3.5, p.s * C.BALL_R * 1.5);
      if (fx === 'fire') {
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: p.x + (Math.random() - 0.5) * r,
            y: p.y + (Math.random() - 0.5) * r,
            vx: (Math.random() - 0.5) * 60,
            vy: -40 - Math.random() * 80,
            life: 0.3 + Math.random() * 0.3,
            age: 0,
            kind: 'fire',
            r: r * (0.6 + Math.random() * 0.8),
          });
        }
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        glow.addColorStop(0, 'rgba(255,200,50,0.9)');
        glow.addColorStop(0.4, 'rgba(255,90,0,0.5)');
        glow.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);
      } else if (fx === 'gold') {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        glow.addColorStop(0, 'rgba(255,230,80,0.85)');
        glow.addColorStop(1, 'rgba(255,214,10,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);
      }
      ctx.fillStyle = fx === 'fire' ? '#fff3b0' : fx === 'gold' ? '#ffd60a' : '#fffdf5';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      // 회전(스핀) 표시
      ctx.strokeStyle = fx === 'none' ? 'rgba(255,140,0,0.9)' : 'rgba(180,60,0,0.9)';
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.beginPath();
      const rot = b.rot || 0;
      ctx.arc(p.x, p.y, r * 0.65, rot, rot + Math.PI * 0.8);
      ctx.stroke();
      this.ballScreen = { x: p.x, y: p.y, r };
    }

    drawEffects(ctx, dt) {
      ctx.save();
      for (const e of this.effects) {
        e.t += dt;
        if (e.type === 'ring') {
          const k = e.t / 0.45;
          const col = e.tier === 'fire' ? '255,120,0' : e.tier === 'gold' ? '255,214,10' : '255,255,255';
          ctx.strokeStyle = `rgba(${col},${1 - k})`;
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, 10 + k * (e.tier === 'fire' ? 140 : 70), 0, Math.PI * 2);
          ctx.stroke();
        } else if (e.type === 'ripple') {
          const k = e.t / 0.4;
          ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.s * (0.02 + k * 0.08), e.s * (0.008 + k * 0.03), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      this.effects = this.effects.filter((e) => e.t < (e.type === 'ring' ? 0.45 : 0.4));

      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        const k = 1 - p.age / p.life;
        if (k <= 0) continue;
        let col;
        if (p.kind === 'fire') col = k > 0.6 ? `rgba(255,240,150,${k})` : k > 0.3 ? `rgba(255,130,0,${k})` : `rgba(200,30,0,${k})`;
        else if (p.kind === 'spark-gold') col = `rgba(255,214,10,${k})`;
        else col = `rgba(255,255,255,${k})`;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      this.particles = this.particles.filter((p) => p.age < p.life);
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
      ctx.restore();
    }

    // 상대 코트 위 조준점 🎯
    drawAim(ctx, aim) {
      const p = this.project(aim.x, aim.y, 0.002);
      if (!p) return;
      const rx = Math.max(10, p.s * 0.09);
      const ry = rx * 0.45;
      const pulse = 1 + Math.sin(this.time * 6) * 0.08;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,10,0.95)';
      ctx.lineWidth = 2.5;
      for (const k of [1, 0.55]) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx * k * pulse, ry * k * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,214,10,0.95)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawCrosshair(ctx, cur) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cur.x - 9, cur.y);
      ctx.lineTo(cur.x + 9, cur.y);
      ctx.moveTo(cur.x, cur.y - 9);
      ctx.lineTo(cur.x, cur.y + 9);
      ctx.stroke();
      ctx.restore();
    }

    /*
     * 타이밍 원: 이상적인 타격 순간까지 남은 시간만큼 큰 원이 공 주위에서 줄어든다.
     * 원이 공의 테두리(고정 원)에 닿는 순간이 정확한 타이밍.
     */
    drawTiming(ctx, tm) {
      const b = this.ballScreen;
      if (!b) return;
      const rem = tm.remain;
      if (rem > 1.4 || rem < -tm.window) return;
      ctx.save();
      // 공이 도착할 위치 미리 보기
      if (rem > 0.12) {
        const g = this.project(tm.x, tm.y, tm.z);
        if (g) {
          ctx.setLineDash([4, 5]);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(g.x, g.y, Math.max(8, g.s * 0.05), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      const r0 = b.r + 10;
      const a = Math.abs(rem);
      const col = a < 0.054 ? '255,123,0' : a < 0.114 ? '255,214,10' : '255,255,255';
      // 고정 원 (목표)
      ctx.strokeStyle = `rgba(${col},0.9)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r0, 0, Math.PI * 2);
      ctx.stroke();
      // 줄어드는 원
      if (rem > 0) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(${col},${Math.min(1, 1.6 - rem)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r0 + rem * 170, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (a < 0.06) {
        ctx.font = 'italic 900 22px system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText('NOW!', b.x, b.y - r0 - 16);
        ctx.fillStyle = '#ff7b00';
        ctx.fillText('NOW!', b.x, b.y - r0 - 16);
      }
      ctx.restore();
    }

    drawTexts(ctx, dt) {
      for (const t of this.texts) {
        t.t += dt;
        const life = t.big ? 1.3 : 0.9;
        const k = t.t / life;
        const scale = t.big ? 1 + Math.max(0, 0.4 - t.t) * 2 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.translate(t.x, t.y - t.t * 40);
        ctx.scale(scale, scale);
        ctx.font = `italic 900 ${t.big ? 64 : 30}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = t.big ? 8 : 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
      this.texts = this.texts.filter((t) => t.t < (t.big ? 1.3 : 0.9));
    }
  }

  window.Arena = Arena;
  window.TEAM_COLOR = TEAM_COLOR;
  window.TEAM_DARK = TEAM_DARK;
})();
