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
      this.anim = {};
      this.jumbo = { flash: null };
      this.lastDt = 1 / 60;
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

      // 위에서 비스듬히 내려다보는 중계 카메라 (공이 내 뒤쪽으로 와도 보이도록)
      const portrait = h > w * 1.15;
      const fy = h / 2 / Math.tan((52 * Math.PI) / 360);
      // 세로 화면(휴대폰)은 좌우를 조금 잘라내고 확대해서 탁구대와 선수를 크게 보여준다
      const fx = w / 2 / Math.tan(((portrait ? 44 : 62) * Math.PI) / 360);
      this.setCamera(v(0, -5.2, 4.6), v(0, 0.55, -0.7), Math.min(fy, fx), h * (portrait ? 0.52 : 0.55));
      this.baseCam = this.saveCamera();
      this.buildStatic();
    }

    setCamera(eye, target, f, cy) {
      this.eye = eye;
      this.fwd = norm(sub(target, eye));
      this.right = norm(cross(this.fwd, v(0, 0, 1)));
      this.up = cross(this.right, this.fwd);
      this.f = f;
      this.cy = cy;
    }

    saveCamera() {
      return { eye: this.eye, fwd: this.fwd, right: this.right, up: this.up, f: this.f, cy: this.cy };
    }

    restoreCamera(c) {
      Object.assign(this, c);
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
      // 경기장 배경은 "보는 사람 기준" 좌표로 그린다 (B팀 화면도 똑같이 보이도록)
      const realView = this.view;
      this.view = 'A';
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
      this.poly(ctx, [[-14, -4.9, F], [14, -4.9, F], [14, 14, F], [-14, 14, F]], '#14182c');
      this.poly(ctx, [[-4.2, -4.9, F], [4.2, -4.9, F], [4.2, 5.6, F], [-4.2, 5.6, F]], '#a3262e');
      // 코트 매트 결
      for (let i = -4; i <= 5; i += 1) this.poly(ctx, [[-4.2, i, F], [4.2, i, F]], null, 'rgba(0,0,0,0.12)', 1);

      // 펜스(광고판) 위치 — 광고 내용은 buildBoards() 에서 별도 레이어로 그린다
      const boardH = 0.72;
      this.boardQuads = [];
      for (let i = 0; i < 6; i++) {
        const x0 = -4.2 + i * 1.4;
        this.boardQuads.push([[x0, 5.6, F], [x0 + 1.4, 5.6, F], [x0 + 1.4, 5.6, F + boardH], [x0, 5.6, F + boardH]]);
      }
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const y0 = -1.6 + i * 1.2;
          this.boardQuads.push([[sgn * 4.2, y0, F], [sgn * 4.2, y0 + 1.2, F], [sgn * 4.2, y0 + 1.2, F + boardH], [sgn * 4.2, y0, F + boardH]]);
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
      const ux = 2.4;
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
        // 심판 본인은 매 프레임 drawOfficials() 에서 움직이며 그린다
      }
      this.bg = bg;

      this.buildCrowd(realView);
      this.view = realView;
      this.buildTable();
      this.boardsKey = null;
    }

    // 텍스처(광고 이미지)를 3D 사각형(광고판)에 원근감 있게 붙인다 (아핀 변환 근사)
    drawQuad(ctx, tex, quad) {
      const ps = quad.map((q) => this.project(q[0], q[1], q[2]));
      if (ps.some((p) => !p)) return;
      let [bl, br, tr, tl] = ps;
      if (br.x < bl.x) [bl, br, tr, tl] = [br, bl, tl, tr]; // 글자가 뒤집히지 않도록
      const W = tex.width;
      const H = tex.height;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.clip();
      ctx.transform((tr.x - tl.x) / W, (tr.y - tl.y) / W, (bl.x - tl.x) / H, (bl.y - tl.y) / H, tl.x, tl.y);
      ctx.drawImage(tex, 0, 0);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.stroke();
    }

    // 광고 한 장 → 광고판 텍스처
    adTexture(ad) {
      const c = document.createElement('canvas');
      c.width = 360;
      c.height = 72;
      const g = c.getContext('2d');
      g.fillStyle = ad.bg;
      g.fillRect(0, 0, 360, 72);
      // LED 느낌의 밝은 테두리
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(0, 0, 360, 6);
      let x = 180;
      let maxW = 340;
      const img = window.Ads && Ads.image(ad);
      if (img) {
        const ih = 56;
        const iw = Math.min(110, (img.width / img.height) * ih);
        g.drawImage(img, 10, 8, iw, ih);
        x = 10 + iw + (350 - iw) / 2;
        maxW = 340 - iw - 10;
      }
      g.fillStyle = ad.fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `900 ${ad.sub ? 30 : 38}px system-ui, sans-serif`;
      g.fillText(ad.title, x, ad.sub ? 28 : 38, maxW);
      if (ad.sub) {
        g.font = '700 17px system-ui, sans-serif';
        g.fillText(ad.sub, x, 56, maxW);
      }
      return c;
    }

    buildBoards(ads) {
      const { w, h, dpr } = this;
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const realView = this.view;
      this.view = 'A';
      const cache = new Map();
      this.boardQuads.forEach((q, i) => {
        const ad = ads[i % Math.max(1, ads.length)] || { id: 'x', title: 'PING PONG ARENA', bg: '#0b3d91', fg: '#fff' };
        if (!cache.has(ad.id)) cache.set(ad.id, this.adTexture(ad));
        this.drawQuad(ctx, cache.get(ad.id), q);
      });
      this.view = realView;
      this.boards = cv;
    }

    /*
     * 관중 스프라이트: 다양한 헤어·소품·옷의 2등신 관중을 미리 그려 둔다.
     * 각 관중은 평소 모습(normal)과 환호 모습(cheer) 두 장.
     */
    makeSpectatorTraits(rnd) {
      const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
      return {
        skin: pick(['#ffe0c2', '#f6c9a0', '#f1c27d', '#e0ac69', '#c68642', '#8d5524']),
        hair: pick(['#2b2118', '#2b2118', '#3d2b1f', '#6b4423', '#e9c46a', '#d1495b', '#3a86ff', '#9b5de5', '#adb5bd']),
        style: pick(['short', 'short', 'spiky', 'bob', 'pony', 'pigtails', 'afro', 'bald', 'long', 'mohawk']),
        shirt: pick(['#f1faee', '#a8dadc', '#457b9d', '#ffb703', '#fb8500', '#8338ec', '#06d6a0', '#ff006e', '#ffd6e0', '#2b2d42']),
        teamShirt: rnd() < 0.45,
        hoodie: rnd() < 0.18,
        scarf: rnd() < 0.15,
        hat: rnd() < 0.16 ? pick(['cap', 'beanie', 'band']) : null,
        glasses: rnd() < 0.16 ? pick(['round', 'sun']) : null,
        paint: rnd() < 0.18,
        phones: rnd() < 0.12,
        item: rnd() < 0.3 ? pick(['finger', 'popcorn', 'phone', 'drink']) : null,
        headphones: rnd() < 0.05,
        eyes: pick(['dot', 'dot', 'oval', 'sparkle']),
      };
    }

    makeSpectatorSprite(tr, team, cheer) {
      const W = 96;
      const H = 128;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const O = '#1b1b2f';
      const tc = TEAM_COLOR[team];
      const shirt = tr.teamShirt ? tc : tr.shirt;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const outline = (w) => {
        g.lineWidth = w || 3;
        g.strokeStyle = O;
        g.stroke();
      };
      // 후드 (머리 뒤)
      if (tr.hoodie) {
        g.fillStyle = shirt;
        g.beginPath();
        g.ellipse(48, 76, 30, 22, 0, 0, Math.PI * 2);
        g.fill();
        outline(2.5);
      }
      // 아프로/긴머리 뒷머리
      g.fillStyle = tr.hair;
      if (tr.style === 'afro') {
        g.beginPath();
        g.arc(48, 52, 38, 0, Math.PI * 2);
        g.fill();
        outline(2.5);
      } else if (tr.style === 'long') {
        g.beginPath();
        g.ellipse(48, 70, 33, 34, 0, 0, Math.PI * 2);
        g.fill();
        outline(2.5);
      }
      // 팔 (환호하면 만세)
      const arm = (x0, y0, x1, y1) => {
        g.strokeStyle = O;
        g.lineWidth = 12;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        g.strokeStyle = tr.hoodie ? shirt : tr.skin;
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        g.fillStyle = tr.skin;
        g.beginPath();
        g.arc(x1, y1, 6, 0, Math.PI * 2);
        g.fill();
        outline(2.5);
      };
      if (cheer) {
        arm(28, 96, 12, 44);
        arm(68, 96, 84, 44);
      }
      // 몸통
      g.fillStyle = shirt;
      g.beginPath();
      g.ellipse(48, 112, 28, 26, 0, Math.PI, Math.PI * 2);
      g.lineTo(76, 128);
      g.lineTo(20, 128);
      g.closePath();
      g.fill();
      outline(3);
      // 줄무늬 / 머플러
      if (tr.teamShirt) {
        g.fillStyle = '#ffffff';
        g.fillRect(30, 104, 36, 4);
      }
      if (tr.scarf) {
        g.fillStyle = tc;
        g.fillRect(28, 88, 40, 9);
        g.fillStyle = '#ffffff';
        for (let x = 30; x < 66; x += 8) g.fillRect(x, 88, 4, 9);
        g.fillStyle = tc;
        g.fillRect(56, 94, 9, 22);
      }
      if (!cheer) {
        // 팔을 내리고 있거나 소품을 든다
        if (tr.item === 'popcorn') {
          arm(26, 104, 36, 112);
          arm(70, 104, 60, 112);
          g.fillStyle = '#e63946';
          g.beginPath();
          g.moveTo(36, 100);
          g.lineTo(60, 100);
          g.lineTo(57, 124);
          g.lineTo(39, 124);
          g.closePath();
          g.fill();
          outline(2);
          g.fillStyle = '#fff';
          g.fillRect(44, 100, 4, 24);
          g.fillStyle = '#fff3c4';
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.arc(39 + k * 4.5, 98 - (k % 2) * 3, 4, 0, Math.PI * 2);
            g.fill();
          }
        } else if (tr.item === 'drink') {
          arm(70, 104, 62, 110);
          g.fillStyle = '#4cc9f0';
          g.fillRect(56, 98, 12, 18);
          g.strokeStyle = O;
          g.lineWidth = 2;
          g.strokeRect(56, 98, 12, 18);
          g.strokeStyle = '#fff';
          g.beginPath();
          g.moveTo(64, 98);
          g.lineTo(68, 88);
          g.stroke();
        }
      } else if (tr.item === 'finger') {
        // 폼핑거 (#1)
        g.fillStyle = tc;
        g.beginPath();
        g.ellipse(84, 34, 11, 13, 0, 0, Math.PI * 2);
        g.fill();
        outline(2);
        g.fillRect(80, 8, 8, 24);
        g.strokeStyle = O;
        g.lineWidth = 2;
        g.strokeRect(80, 8, 8, 24);
        g.fillStyle = '#fff';
        g.font = '900 10px system-ui';
        g.textAlign = 'center';
        g.fillText('1', 84, 38);
      } else if (tr.item === 'phone' || tr.phones) {
        g.fillStyle = '#212529';
        g.fillRect(6, 26, 14, 22);
        g.fillStyle = '#74c0fc';
        g.fillRect(8, 28, 10, 16);
      }
      // 머리
      const hx = 48;
      const hy = 58;
      const hr = 30;
      g.fillStyle = tr.skin;
      g.beginPath();
      g.arc(hx, hy, hr, 0, Math.PI * 2);
      g.fill();
      outline(3);
      // 앞머리
      g.fillStyle = tr.hair;
      const st = tr.style;
      if (st === 'short' || st === 'long' || st === 'bob' || st === 'pony' || st === 'pigtails') {
        g.beginPath();
        g.arc(hx, hy - 4, hr + 1, Math.PI * 1.02, Math.PI * 1.98);
        g.quadraticCurveTo(hx + 8, hy - 18, hx - 4, hy - 12);
        g.quadraticCurveTo(hx - 18, hy - 16, hx - hr, hy - 2);
        g.fill();
        outline(2.5);
        if (st === 'bob') {
          g.beginPath();
          g.ellipse(hx - hr + 3, hy + 6, 7, 16, 0, 0, Math.PI * 2);
          g.ellipse(hx + hr - 3, hy + 6, 7, 16, 0, 0, Math.PI * 2);
          g.fill();
          outline(2);
        }
        if (st === 'pony') {
          g.beginPath();
          g.ellipse(hx + hr + 6, hy - 6, 9, 18, 0.5, 0, Math.PI * 2);
          g.fill();
          outline(2);
        }
        if (st === 'pigtails') {
          for (const sx of [-1, 1]) {
            g.beginPath();
            g.arc(hx + sx * (hr + 6), hy - 12, 10, 0, Math.PI * 2);
            g.fill();
            outline(2);
          }
        }
      } else if (st === 'spiky') {
        g.beginPath();
        g.moveTo(hx - hr, hy - 4);
        for (let k = 0; k <= 6; k++) {
          const a = Math.PI + (k / 6) * Math.PI;
          const r = k % 2 ? hr + 12 : hr;
          g.lineTo(hx + Math.cos(a) * r, hy - 4 + Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
        outline(2.5);
      } else if (st === 'mohawk') {
        g.beginPath();
        g.ellipse(hx, hy - hr + 2, 7, 16, 0, 0, Math.PI * 2);
        g.fill();
        outline(2);
      } else if (st === 'afro') {
        g.beginPath();
        g.arc(hx, hy - 10, hr + 2, Math.PI * 1.05, Math.PI * 1.95);
        g.fill();
      } else if (st === 'bald') {
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath();
        g.ellipse(hx - 10, hy - 18, 7, 4, -0.5, 0, Math.PI * 2);
        g.fill();
      }
      // 모자
      if (tr.hat === 'cap') {
        g.fillStyle = tc;
        g.beginPath();
        g.arc(hx, hy - 8, hr, Math.PI, Math.PI * 2);
        g.closePath();
        g.fill();
        outline(2.5);
        g.beginPath();
        g.ellipse(hx + 16, hy - 8, 20, 5, 0, 0, Math.PI * 2);
        g.fill();
        outline(2);
      } else if (tr.hat === 'beanie') {
        g.fillStyle = tc;
        g.beginPath();
        g.arc(hx, hy - 6, hr + 1, Math.PI, Math.PI * 2);
        g.closePath();
        g.fill();
        outline(2.5);
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(hx, hy - hr - 8, 7, 0, Math.PI * 2);
        g.fill();
        outline(2);
      } else if (tr.hat === 'band') {
        g.fillStyle = tc;
        g.fillRect(hx - hr + 1, hy - 18, hr * 2 - 2, 8);
      }
      if (tr.headphones) {
        g.strokeStyle = '#212529';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(hx, hy - 2, hr + 3, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
        g.fillStyle = tc;
        g.fillRect(hx - hr - 6, hy - 4, 9, 16);
        g.fillRect(hx + hr - 3, hy - 4, 9, 16);
      }
      // 볼 페인팅 (팀 줄무늬)
      if (tr.paint) {
        g.fillStyle = tc;
        g.fillRect(hx - 22, hy + 6, 9, 3);
        g.fillRect(hx - 22, hy + 11, 9, 3);
        g.fillStyle = '#fff';
        g.fillRect(hx + 13, hy + 6, 9, 3);
        g.fillStyle = tc;
        g.fillRect(hx + 13, hy + 11, 9, 3);
      } else {
        g.fillStyle = 'rgba(255,90,120,0.35)';
        g.beginPath();
        g.ellipse(hx - 18, hy + 10, 6, 4, 0, 0, Math.PI * 2);
        g.ellipse(hx + 18, hy + 10, 6, 4, 0, 0, Math.PI * 2);
        g.fill();
      }
      // 눈
      g.fillStyle = O;
      g.strokeStyle = O;
      if (cheer) {
        // ^^ 웃는 눈
        g.lineWidth = 3;
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(hx + sx * 11, hy + 2, 5, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        }
      } else if (tr.eyes === 'oval') {
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.ellipse(hx + sx * 11, hy, 3.5, 5.5, 0, 0, Math.PI * 2);
          g.fill();
        }
      } else if (tr.eyes === 'sparkle') {
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(hx + sx * 11, hy, 5.5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#fff';
          g.beginPath();
          g.arc(hx + sx * 11 - 1.5, hy - 2, 2, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = O;
        }
      } else {
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(hx + sx * 11, hy, 3.5, 0, Math.PI * 2);
          g.fill();
        }
      }
      // 안경
      if (tr.glasses === 'round' && !cheer) {
        g.lineWidth = 2;
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(hx + sx * 11, hy, 8, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(hx - 3, hy);
        g.lineTo(hx + 3, hy);
        g.stroke();
      } else if (tr.glasses === 'sun') {
        g.fillStyle = '#111';
        g.beginPath();
        g.ellipse(hx - 11, hy, 9, 6, 0, 0, Math.PI * 2);
        g.ellipse(hx + 11, hy, 9, 6, 0, 0, Math.PI * 2);
        g.fill();
        g.fillRect(hx - 3, hy - 2, 6, 2);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(hx - 15, hy - 3, 5, 2);
        g.fillRect(hx + 7, hy - 3, 5, 2);
      }
      // 입
      g.fillStyle = O;
      if (cheer) {
        g.beginPath();
        g.arc(hx, hy + 13, 9, 0, Math.PI);
        g.closePath();
        g.fill();
        g.fillStyle = '#ff6b81';
        g.beginPath();
        g.arc(hx, hy + 18, 4.5, 0, Math.PI);
        g.fill();
      } else {
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(hx, hy + 10, 6, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      }
      // 환호할 때 폰 들고 사진 찍기
      if (cheer && (tr.item === 'phone' || tr.phones)) {
        g.fillStyle = '#212529';
        g.fillRect(4, 22, 16, 24);
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(12, 26, 2, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    }

    buildCrowd(realView) {
      const rnd = mulberry(7);
      const F = C.FLOOR_Z;
      // 스프라이트 묶음 (팀마다 28가지 모습 x 평소/환호)
      if (!this.spriteSets) {
        const srnd = mulberry(99);
        this.spriteSets = { A: [], B: [] };
        for (let i = 0; i < 28; i++) {
          const tr = this.makeSpectatorTraits(srnd);
          for (const team of ['A', 'B']) {
            this.spriteSets[team].push({ normal: this.makeSpectatorSprite(tr, team, false), cheer: this.makeSpectatorSprite(tr, team, true), phone: tr.item === 'phone' || tr.phones });
          }
        }
      }
      const people = [];
      const signs = ['화이팅!', 'NICE!', '최고!', 'GO GO!', '♥', 'PERFECT', '대박!', '사랑해요', '한 번 더!'];
      const tiers = 10;
      for (let i = 0; i < tiers; i++) {
        const y = 6.2 + i * 0.75 + 0.35;
        const z = F + 0.6 + i * 0.55;
        for (let x = -13.5; x <= 13.5; x += 0.55 + rnd() * 0.15) {
          if (rnd() < 0.06) continue;
          people.push({ x: x + rnd() * 0.1, y, z, team: x < 0 ? 'A' : 'B', row: i, side: 0 });
        }
      }
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < tiers; i++) {
          const x = sgn * (4.6 + i * 0.75 + 0.35);
          const z = F + 0.6 + i * 0.55;
          for (let y = -1.6; y <= 6.2; y += 0.55 + rnd() * 0.15) {
            if (rnd() < 0.06) continue;
            people.push({ x, y, z, team: sgn < 0 ? 'A' : 'B', row: i, side: sgn });
          }
        }
      }
      this.crowd = [];
      for (const p of people) {
        const pr = this.project(p.x, p.y, p.z);
        if (!pr || pr.x < -40 || pr.x > this.w + 40 || pr.y < -40) continue;
        const team = realView === 'A' ? p.team : p.team === 'A' ? 'B' : 'A';
        const r = rnd();
        this.crowd.push({
          x: pr.x,
          y: pr.y,
          s: pr.s,
          sprite: this.spriteSets[team][Math.floor(rnd() * 28)],
          phase: rnd() * Math.PI * 2,
          speed: 2 + rnd() * 3,
          // 소품: 깃발 / 응원 피켓 / 응원봉
          prop: r < 0.06 ? 'flag' : r < 0.1 ? 'sign' : r < 0.15 ? 'stick' : null,
          sign: signs[Math.floor(rnd() * signs.length)],
          team,
          row: p.row,
          stand: p.side,
          wx: p.x,
          wy: p.y,
          flash: 0,
        });
      }
      // 멀리 있는 사람부터 그린다
      this.crowd.sort((a, b) => a.s - b.s);

      // 여러 명이 함께 드는 응원 현수막 (뒤쪽 관중석 1~3열)
      this.banners = [];
      const texts = { A: ['GO RED! 🔥', 'RED 최고!', '빨강 팀 화이팅!'], B: ['GO BLUE! 💙', 'BLUE 최고!', '파랑 팀 화이팅!'] };
      for (const [x0, row, team] of [[-6.2, 1, 'A'], [-2.6, 3, 'A'], [2.2, 2, 'B'], [5.6, 1, 'B']]) {
        const y = 6.2 + row * 0.75 + 0.35;
        const z = F + 0.6 + row * 0.55 + 0.45;
        const a = this.project(x0, y, z);
        const b = this.project(x0 + 2.6, y, z);
        if (!a || !b) continue;
        const t = realView === 'A' ? team : team === 'A' ? 'B' : 'A';
        this.banners.push({ a, b, team: t, text: texts[t][Math.floor(rnd() * 3)], phase: rnd() * 6 });
      }
    }

    buildTable() {
      const { w, h, dpr } = this;
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      this.drawTableTo(ctx);
      this.table = cv;
    }

    drawTableTo(ctx) {
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
      if (tier === 'fire') {
        this.shake = 0.35;
        this.photoFlash = 0.4;
      }
    }

    bounceFx(x, y) {
      const p = this.project(x, y, 0);
      if (p) this.effects.push({ type: 'ripple', x: p.x, y: p.y, s: p.s, t: 0 });
    }

    celebrate(team) {
      this.cheer = 2.2;
      this.cheerSide = team;
      this.flashBurst = 0.8;
      this.photoFlash = 0.6;
    }

    /* ---------------- 프레임 그리기 ---------------- */
    draw(frame, dt) {
      const ctx = this.ctx;
      const { w, h, dpr } = this;
      this.time += dt;
      this.lastDt = Math.max(1 / 240, dt);
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
      if (frame.special) {
        this.drawSpecial(ctx, frame, dt);
        this.drawTexts(ctx, dt);
        return;
      }
      if (this.specialFlash > 0) this.specialFlash -= dt;
      ctx.drawImage(this.bg, 0, 0, w, h);
      this.drawCrowd(ctx, dt);
      // 광고판 (광고가 바뀌면 다시 그린다)
      const set = window.Ads ? Ads.boards(this.boardQuads.length, Date.now()) : { key: 'none', ads: [] };
      if (set.key !== this.boardsKey || !this.boards) {
        this.boardsKey = set.key;
        this.buildBoards(set.ads);
      }
      ctx.drawImage(this.boards, 0, 0, w, h);
      this.drawMascots(ctx);
      this.drawOfficials(ctx, frame);

      const players = frame.players || [];
      const viewTeam = this.view;
      const far = players.filter((p) => p.slot[0] !== viewTeam).sort((a, b) => Math.abs(b.paddle ? b.paddle.y : 0) - Math.abs(a.paddle ? a.paddle.y : 0));
      const near = players.filter((p) => p.slot[0] === viewTeam);

      for (const p of far) this.drawPlayer(ctx, p, frame, false);
      ctx.drawImage(this.table, 0, 0, w, h);
      if (frame.ball) this.drawBall(ctx, frame.ball, frame.fx, dt);
      if (frame.aim) this.drawAim(ctx, frame.aim);
      for (const p of near) this.drawPlayer(ctx, p, frame, true);
      if (frame.timing && frame.ball) this.drawTiming(ctx, frame.timing);

      this.drawEffects(ctx, dt);
      if (frame.board) this.drawJumbotron(ctx, frame.board, dt);
      if (frame.racket) this.drawRacket(ctx, frame.racket);
      if (this.specialFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.specialFlash * 2})`;
        ctx.fillRect(0, 0, w, h);
      }
      this.drawTexts(ctx, dt);
    }

    /*
     * 필살기 연출: 매트릭스처럼 시간이 멈추고 카메라가 선수 주위를 빙글 돈다.
     * 그동안 선수는 웃긴 춤을 추고, 마지막에 라켓을 크게 젖혀 슈퍼샷 준비!
     */
    drawSpecial(ctx, frame, dt) {
      const { w, h } = this;
      const sp = frame.special;
      const u = Math.min(1, sp.t / sp.dur);
      const hitter = (frame.players || []).find((p) => p.slot === sp.slot);
      const team = sp.slot[0];
      const pad = (hitter && hitter.paddle) || { x: 0, y: team === 'A' ? -1.8 : 1.8, z: 0.2 };
      const xs = team === 'A' ? 1 : -1;
      const sgn = team === 'A' ? -1 : 1;
      // 선수 몸 위치 (drawPlayer 와 같은 계산) → 보는 사람 기준 좌표
      let bx = pad.x - 0.3 * xs;
      let by = sgn * Math.max(C.HL + 0.45, Math.abs(pad.y) + 0.35);
      if (this.view === 'B') {
        bx = -bx;
        by = -by;
      }
      const ease = (k) => k * k * (3 - 2 * k);
      const a0 = Math.atan2(this.baseCam.eye.y - by, this.baseCam.eye.x - bx);
      const ang = a0 + ease(u) * Math.PI * 1.35;
      const R = 3.4 - 1.5 * ease(Math.min(1, u * 2.5));
      const camZ = 0.55 + Math.sin(u * Math.PI) * 0.45;
      const base = this.saveCamera();
      const f = Math.min(h / 2 / Math.tan((50 * Math.PI) / 360), w / 2 / Math.tan((64 * Math.PI) / 360));
      this.setCamera(v(bx + Math.cos(ang) * R, by + Math.sin(ang) * R, camZ), v(bx, by, 0.05), f, h * 0.55);

      // 매트릭스 배경
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, '#0d2a1a');
      g.addColorStop(1, '#010604');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.font = '700 16px monospace';
      ctx.textAlign = 'center';
      const cols = Math.ceil(w / 22);
      for (let i = 0; i < cols; i++) {
        const speed = 120 + ((i * 53) % 90);
        const y0 = ((this.time * speed + i * 137) % (h + 200)) - 100;
        for (let k = 0; k < 8; k++) {
          ctx.fillStyle = `rgba(80,255,140,${(0.5 * (8 - k)) / 8})`;
          const ch = String.fromCharCode(0x30a0 + ((i * 7 + k * 13 + Math.floor(this.time * 10)) % 90));
          ctx.fillText(ch, i * 22 + 11, y0 - k * 18);
        }
      }
      // 바닥 격자 (가까운 타일만 그려짐)
      const F = C.FLOOR_Z;
      for (let x = -4; x < 4; x += 1) {
        for (let y = -6; y < 6; y += 1) {
          this.poly(ctx, [[x, y, F], [x + 1, y, F], [x + 1, y + 1, F], [x, y + 1, F]], (x + y) % 2 ? 'rgba(163,38,46,0.85)' : 'rgba(140,30,40,0.85)', 'rgba(120,255,170,0.35)', 1);
        }
      }
      // 탁구대 + 선수들
      this.drawTableTo(ctx);
      for (const p of frame.players || []) {
        const isHitter = p.slot === sp.slot;
        this.drawPlayer(ctx, Object.assign({}, p, isHitter ? { dance: u < 0.78 ? sp.t : null, windup: u >= 0.78 ? (u - 0.78) / 0.22 : 0, isTurn: false } : { isTurn: false }), Object.assign({}, frame, { celebrate: null }), false);
      }
      // 멈춘 공 + 시간 정지 파문
      if (frame.ball) {
        const bp = this.project(frame.ball.x, frame.ball.y, frame.ball.z);
        if (bp) {
          const r = Math.max(5, bp.s * C.BALL_R * 1.6);
          for (let k = 0; k < 3; k++) {
            const rr = r * (2 + ((this.time * 2 + k / 3) % 1) * 6);
            ctx.strokeStyle = `rgba(160,255,200,${0.6 * (1 - (((this.time * 2 + k / 3) % 1)))})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rr, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = '#fffdf5';
          ctx.shadowColor = '#c77dff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      this.restoreCamera(base);

      // 집중선
      ctx.save();
      ctx.translate(w / 2, h * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2 + this.time * 0.3;
        const r0 = Math.min(w, h) * (0.42 + ((i * 17) % 10) / 60);
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * w, Math.sin(a) * w);
        ctx.stroke();
      }
      ctx.restore();
      // 영화 같은 위아래 검은 띠 + 자막
      const bar = h * 0.11 * Math.min(1, sp.t * 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
      const name = hitter ? hitter.name : '';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 900 ${Math.round(Math.min(48, w * 0.07))}px system-ui, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      const title = u < 0.78 ? `⚡ ${name} 필살기!` : sp.kind === 'smash' ? '💥 SUPER SMASH!!' : '🌪 SUPER DRIVE!!';
      ctx.strokeText(title, w / 2, h - bar - 40);
      ctx.fillStyle = u < 0.78 ? '#c77dff' : '#ffd60a';
      ctx.fillText(title, w / 2, h - bar - 40);
      ctx.font = '700 14px system-ui';
      ctx.fillStyle = 'rgba(160,255,200,0.9)';
      ctx.fillText('BULLET TIME', w / 2, bar / 2);
      if (u > 0.96) this.specialFlash = 0.35;
    }

    drawCrowd(ctx, dt) {
      if (this.cheer > 0) this.cheer -= dt;
      if (this.flashBurst > 0) this.flashBurst -= dt;
      const t = this.time;
      const cheering = this.cheer > 0;
      // 20초마다 6초 동안 파도타기 응원
      const waveOn = t % 20 < 6;
      const waveX = ((t % 20) / 6) * (this.w + 400) - 200;
      for (const c of this.crowd) {
        const excited = cheering && (!this.cheerSide || c.team === this.cheerSide);
        const inWave = waveOn && Math.abs(c.x - waveX) < 70;
        const s = c.s;
        let bob = Math.abs(Math.sin(t * c.speed * (excited ? 2.2 : 0.6) + c.phase)) * (excited ? 0.28 : 0.03) * s;
        if (inWave) bob = Math.max(bob, (1 - Math.abs(c.x - waveX) / 70) * 0.35 * s);
        const y = c.y - bob;
        const happy = excited || inWave;
        const img = happy ? c.sprite.cheer : c.sprite.normal;
        const scale = (s * 0.78) / 128;
        const w = 96 * scale;
        const h = 128 * scale;
        // 신나면 좌우로 들썩
        const sway = happy ? Math.sin(t * 9 + c.phase) * s * 0.03 : 0;
        ctx.drawImage(img, c.x - w / 2 + sway, y - h, w, h);

        // 폰 카메라 플래시 (평소엔 가끔, 득점 순간엔 와르르)
        if (c.flash > 0) c.flash -= dt;
        else if ((c.sprite.phone && Math.random() < dt * 0.15) || (this.flashBurst > 0 && Math.random() < dt * 1.2)) c.flash = 0.18;
        if (c.flash > 0) {
          const fx = c.x - w * 0.38;
          const fy = y - h * 0.72;
          const k = c.flash / 0.18;
          const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.35 * k + 4);
          rg.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(fx - s * 0.4, fy - s * 0.4, s * 0.8, s * 0.8);
        }
        // 소품
        if (c.prop === 'flag') {
          const wave = Math.sin(t * 3 + c.phase) * s * 0.08;
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x + s * 0.2, y - s * 0.2);
          ctx.lineTo(c.x + s * 0.2, y - s * 1.0);
          ctx.stroke();
          ctx.fillStyle = TEAM_COLOR[c.team];
          ctx.fillRect(c.x + s * 0.2, y - s * 1.0 + wave, s * 0.42, s * 0.26);
        } else if (c.prop === 'sign') {
          const lift = happy ? s * 0.25 : 0;
          ctx.fillStyle = '#fff';
          ctx.fillRect(c.x - s * 0.42, y - s * 1.0 - lift, s * 0.84, s * 0.32);
          ctx.strokeStyle = TEAM_COLOR[c.team];
          ctx.lineWidth = Math.max(1, s * 0.03);
          ctx.strokeRect(c.x - s * 0.42, y - s * 1.0 - lift, s * 0.84, s * 0.32);
          ctx.fillStyle = TEAM_COLOR[c.team];
          ctx.font = `900 ${Math.max(6, s * 0.16)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c.sign, c.x, y - s * 0.84 - lift, s * 0.8);
        } else if (c.prop === 'stick') {
          const sw = Math.sin(t * (happy ? 9 : 3) + c.phase) * 0.5;
          const tx = c.x + s * 0.18 + Math.sin(sw) * s * 0.3;
          const ty = y - s * 0.65 - Math.cos(sw) * s * 0.25;
          ctx.strokeStyle = TEAM_COLOR[c.team];
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2, s * 0.07);
          ctx.beginPath();
          ctx.moveTo(c.x + s * 0.16, y - s * 0.3);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(1.5, s * 0.05), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 응원 현수막 (물결치며 흔들림)
      for (const bn of this.banners || []) {
        const excited = cheering && (!this.cheerSide || bn.team === this.cheerSide);
        const hgt = Math.max(10, bn.a.s * 0.3);
        const seg = 16;
        const lift = excited ? Math.abs(Math.sin(t * 8)) * hgt * 0.6 : 0;
        ctx.beginPath();
        for (let k = 0; k <= seg; k++) {
          const u = k / seg;
          const x = bn.a.x + (bn.b.x - bn.a.x) * u;
          const y = bn.a.y + (bn.b.y - bn.a.y) * u + Math.sin(t * 3 + bn.phase + u * 6) * hgt * 0.15 - lift;
          k ? ctx.lineTo(x, y - hgt) : ctx.moveTo(x, y - hgt);
        }
        for (let k = seg; k >= 0; k--) {
          const u = k / seg;
          const x = bn.a.x + (bn.b.x - bn.a.x) * u;
          const y = bn.a.y + (bn.b.y - bn.a.y) * u + Math.sin(t * 3 + bn.phase + u * 6) * hgt * 0.15 - lift;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = TEAM_COLOR[bn.team];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.round(hgt * 0.62)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const mx = (bn.a.x + bn.b.x) / 2;
        const my = (bn.a.y + bn.b.y) / 2 - hgt / 2 + Math.sin(t * 3 + bn.phase + 3) * hgt * 0.15 - lift;
        ctx.fillText(bn.text, mx, my, Math.abs(bn.b.x - bn.a.x) * 0.9);
      }
    }

    /*
     * 심판과 사진기자: 심판은 공을 눈으로 따라가다 득점하면 팀 쪽으로 팔을 든다.
     * 사진기자는 강타·득점 때 플래시를 터뜨린다.
     */
    drawOfficials(ctx, frame) {
      const t = this.time;
      const realView = this.view;
      this.view = 'A';
      const seat = this.project(2.4, 0, C.FLOOR_Z + 0.75);
      const photogs = [this.project(-2.1, 5.25, C.FLOOR_Z), this.project(2.0, 5.25, C.FLOOR_Z)];
      this.view = realView;
      const O = '#1b1b2f';
      if (seat) {
        const s = seat.s;
        // 공 방향 보기 (화면상 공 x)
        const look = this.ballScreen ? Math.max(-1, Math.min(1, (this.ballScreen.x - seat.x) / (s * 2))) : 0;
        const cel = frame.celebrate && frame.celebrate.t < 1.6 ? frame.celebrate.team : null;
        const bx = seat.x;
        const by = seat.y - s * 0.04;
        // 몸 (남색 재킷 + 흰 셔츠 + 나비넥타이)
        ctx.fillStyle = '#1d3557';
        ctx.beginPath();
        ctx.ellipse(bx, by - s * 0.22, s * 0.17, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, s * 0.015);
        ctx.strokeStyle = O;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.05, by - s * 0.42);
        ctx.lineTo(bx + s * 0.05, by - s * 0.42);
        ctx.lineTo(bx, by - s * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.05, by - s * 0.42);
        ctx.lineTo(bx + s * 0.05, by - s * 0.38);
        ctx.lineTo(bx + s * 0.05, by - s * 0.42);
        ctx.lineTo(bx - s * 0.05, by - s * 0.38);
        ctx.closePath();
        ctx.fill();
        // 팔: 득점한 팀 쪽(화면 위=상대, 아래=우리)으로 든다
        ctx.strokeStyle = '#1d3557';
        ctx.lineCap = 'round';
        ctx.lineWidth = s * 0.06;
        const sideSign = cel ? (cel === realView ? 1 : -1) : 0;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.13, by - s * 0.36);
        if (cel) ctx.lineTo(bx - s * 0.3, by - s * (0.55 + 0.1 * Math.sin(t * 10)) + sideSign * s * 0.1);
        else ctx.lineTo(bx - s * 0.16, by - s * 0.12);
        ctx.stroke();
        // 머리
        const hx = bx + look * s * 0.02;
        const hy = by - s * 0.58;
        const hr = s * 0.15;
        ctx.fillStyle = '#ffe0c2';
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6c757d';
        ctx.beginPath();
        ctx.arc(hx, hy - hr * 0.2, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
        ctx.fill();
        // 눈이 공을 따라간다
        ctx.fillStyle = O;
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(hx + sx * hr * 0.38 + look * hr * 0.15, hy + hr * 0.05, Math.max(1, hr * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        // 콧수염
        ctx.fillStyle = '#495057';
        ctx.beginPath();
        ctx.ellipse(hx - hr * 0.2, hy + hr * 0.42, hr * 0.22, hr * 0.09, 0.3, 0, Math.PI * 2);
        ctx.ellipse(hx + hr * 0.2, hy + hr * 0.42, hr * 0.22, hr * 0.09, -0.3, 0, Math.PI * 2);
        ctx.fill();
        if (cel) {
          ctx.font = `900 ${Math.max(10, s * 0.1)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.fillStyle = TEAM_COLOR[cel];
          ctx.fillText('POINT!', hx, hy - hr * 1.7);
        }
      }
      // 사진기자 (쭈그려 앉아 대포 렌즈)
      if (this.photoFlash > 0) this.photoFlash -= this.lastDt;
      photogs.forEach((p, i) => {
        if (!p) return;
        const s = p.s;
        const x = p.x;
        const y = p.y;
        const dir = i === 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.25, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#343a40';
        ctx.beginPath();
        ctx.ellipse(x, y - s * 0.22, s * 0.2, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, s * 0.015);
        ctx.strokeStyle = O;
        ctx.stroke();
        ctx.fillStyle = '#ffe0c2';
        ctx.beginPath();
        ctx.arc(x, y - s * 0.5, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#212529';
        ctx.beginPath();
        ctx.arc(x, y - s * 0.56, s * 0.14, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - s * 0.15, y - s * 0.6, s * 0.3, s * 0.04);
        // 카메라
        ctx.fillStyle = '#111';
        ctx.fillRect(x + dir * s * 0.02 - s * 0.08, y - s * 0.55, s * 0.16, s * 0.12);
        ctx.fillStyle = '#495057';
        ctx.fillRect(x + dir * s * 0.08, y - s * 0.53, dir * s * 0.18, s * 0.08);
        if (this.photoFlash > 0 && Math.floor(t * 20 + i * 3) % 3 === 0) {
          const fx = x + dir * s * 0.28;
          const fy = y - s * 0.5;
          const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.6);
          rg.addColorStop(0, 'rgba(255,255,255,0.95)');
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(fx - s * 0.6, fy - s * 0.6, s * 1.2, s * 1.2);
        }
      });
    }

    // 코트 옆 마스코트 "핑퐁이": 탁구공 모양 캐릭터가 춤춘다
    drawMascots(ctx) {
      const t = this.time;
      const cheer = this.cheer > 0;
      const spots = [
        { x: -3.55, y: 4.7, team: this.view === 'A' ? 'A' : 'B', ph: 0 },
        { x: 3.55, y: 4.7, team: this.view === 'A' ? 'B' : 'A', ph: 1.7 },
      ];
      for (const m of spots) {
        // 배경 좌표(보는 사람 기준)
        const realView = this.view;
        this.view = 'A';
        const foot = this.project(m.x, m.y, C.FLOOR_Z);
        this.view = realView;
        if (!foot) continue;
        const s = foot.s;
        const happy = cheer && (!this.cheerSide || this.cheerSide === m.team);
        const jump = Math.abs(Math.sin(t * (happy ? 9 : 4) + m.ph)) * s * (happy ? 0.45 : 0.12);
        const sway = Math.sin(t * 3 + m.ph) * 0.25 + (happy ? Math.sin(t * 14) * 0.2 : 0);
        const r = s * 0.42;
        const cx = foot.x;
        const cy = foot.y - r - s * 0.22 - jump;
        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, foot.y, r * 0.8 * (1 - jump / (s * 1.2)), r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(sway * 0.4);
        // 다리
        ctx.strokeStyle = '#1b1b2f';
        ctx.lineCap = 'round';
        ctx.lineWidth = s * 0.07;
        const kick = Math.sin(t * 8 + m.ph) * s * 0.08;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.85);
        ctx.lineTo(-r * 0.4 + kick, r + s * 0.2);
        ctx.moveTo(r * 0.35, r * 0.85);
        ctx.lineTo(r * 0.4 - kick, r + s * 0.2);
        ctx.stroke();
        ctx.fillStyle = TEAM_COLOR[m.team];
        ctx.beginPath();
        ctx.ellipse(-r * 0.42 + kick, r + s * 0.22, s * 0.1, s * 0.055, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.42 - kick, r + s * 0.22, s * 0.1, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        // 팔 (만세 / 흔들기)
        const armA = happy ? -2.4 : -0.6 + Math.sin(t * 6 + m.ph) * 0.6;
        ctx.strokeStyle = '#1b1b2f';
        ctx.lineWidth = s * 0.06;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.9, 0);
          ctx.lineTo(sd * (r * 0.9 + Math.cos(armA) * s * 0.3), Math.sin(armA) * s * 0.3);
          ctx.stroke();
        }
        // 몸 = 탁구공
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#ffd8a8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e8590c';
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.stroke();
        // 머리띠
        ctx.fillStyle = TEAM_COLOR[m.team];
        ctx.fillRect(-r * 0.92, -r * 0.62, r * 1.84, r * 0.22);
        // 얼굴
        ctx.fillStyle = '#1b1b2f';
        const blink = Math.sin(t * 1.3 + m.ph) > 0.97;
        if (happy || blink) {
          ctx.lineWidth = Math.max(1, s * 0.035);
          ctx.beginPath();
          ctx.arc(-r * 0.32, -r * 0.05, r * 0.14, Math.PI * 1.1, Math.PI * 1.9);
          ctx.moveTo(r * 0.46, -r * 0.05);
          ctx.arc(r * 0.32, -r * 0.05, r * 0.14, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(-r * 0.32, -r * 0.08, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
          ctx.ellipse(r * 0.32, -r * 0.08, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, r * 0.22, r * (happy ? 0.3 : 0.2), 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,90,120,0.45)';
        ctx.beginPath();
        ctx.arc(-r * 0.6, r * 0.18, r * 0.13, 0, Math.PI * 2);
        ctx.arc(r * 0.6, r * 0.18, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /*
     * 귀여운 2등신 캐릭터: 큰 머리(사진 캐리커처) + 동글동글한 몸
     * - 달릴 때 다리가 빨리 움직이고 몸이 기울며 먼지가 난다
     * - 칠 때 몸이 찌그러졌다 늘어나고(squash & stretch) 라켓을 크게 휘두른다
     * - 득점하면 폴짝폴짝 만세, 실점하면 고개를 떨군다
     * - 칠 차례인 선수는 발밑에 빛나는 고리와 ▼ 표시
     */
    drawPlayer(ctx, p, frame, near) {
      const team = p.slot[0];
      const pad = p.paddle || { x: 0, y: team === 'A' ? -1.8 : 1.8, z: 0.2 };
      const sgn = team === 'A' ? -1 : 1;
      const xs = team === 'A' ? 1 : -1;
      const bodyY = sgn * Math.max(C.HL + (near ? 0.6 : 0.45), Math.abs(pad.y) + 0.35);
      const bodyX = pad.x - (near ? 0.45 : 0.3) * xs;
      const dt = this.lastDt;
      const t = this.time;

      // 애니메이션 상태
      const an = this.anim[p.slot] || (this.anim[p.slot] = { x: bodyX, y: bodyY, speed: 0, leg: 0, lean: 0, sx: null });
      const sp = Math.hypot(bodyX - an.x, bodyY - an.y) / dt;
      an.speed += (Math.min(sp, 8) - an.speed) * Math.min(1, dt * 10);
      an.x = bodyX;
      an.y = bodyY;
      an.leg += dt * (5 + an.speed * 9);
      const dance = p.dance != null ? p.dance : null;
      if (dance != null) an.leg = dance * 14;
      const windup = p.windup || 0;
      const big = p.bigSwing || 0;

      const cel = frame.celebrate;
      const celT = cel ? cel.t : 99;
      const happy = cel && cel.team === team && celT < 1.8;
      const sad = cel && cel.team && cel.team !== team && celT < 1.8;
      let jumpZ = happy ? Math.abs(Math.sin(celT * 7)) * 0.22 : an.speed < 0.3 ? Math.abs(Math.sin(t * 3 + p.slot.charCodeAt(1))) * 0.015 : 0;
      if (dance != null) jumpZ = Math.abs(Math.sin(dance * 7)) * 0.14;
      jumpZ += Math.sin(big * Math.PI) * 0.2; // 강타 때 점프

      const ground = this.project(bodyX, bodyY, C.FLOOR_Z);
      const foot = this.project(bodyX, bodyY, C.FLOOR_Z + jumpZ);
      let hand = this.project(pad.x, pad.y, pad.z);
      // 내 캐릭터의 팔은 내가 움직이는 라켓(화면 위치)으로 뻗는다
      const ownRacket = p.isMe && frame.racket && frame.racket.x > -50 && !frame.special;
      if (ownRacket && hand) hand = { x: frame.racket.x, y: frame.racket.y, s: hand.s };
      if (!ground || !foot) return;
      const k = near ? 0.66 : 0.82;
      const s = foot.s * k;
      if (an.sx != null) {
        const vxs = (foot.x - an.sx) / dt;
        an.lean += (Math.max(-0.35, Math.min(0.35, vxs / 900)) - an.lean) * Math.min(1, dt * 8);
      }
      an.sx = foot.x;
      const swing = p.swing || 0;
      const paddleSideGuess = hand && hand.x > foot.x ? 1 : -1;
      let leanV = an.lean - windup * 0.18 * paddleSideGuess + big * 0.25 * paddleSideGuess;
      if (dance != null) leanV = Math.sin(dance * 11) * 0.35;

      ctx.save();
      if (near) ctx.globalAlpha = 0.75;

      // 칠 차례 표시: 발밑 빛나는 고리
      if (p.isTurn) {
        const pulse = 1 + Math.sin(t * 8) * 0.12;
        ctx.strokeStyle = 'rgba(255,214,10,0.95)';
        ctx.lineWidth = Math.max(2, s * 0.03);
        ctx.beginPath();
        ctx.ellipse(ground.x, ground.y, s * 0.42 * pulse, s * 0.12 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `${TEAM_COLOR[team]}55`;
        ctx.fill();
      }
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(ground.x, ground.y, s * 0.3 * (1 - jumpZ), s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // 달리기 먼지
      if (an.speed > 1.6 && Math.random() < dt * 25) {
        this.particles.push({ x: ground.x + (Math.random() - 0.5) * s * 0.2, y: ground.y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0.4, age: 0, kind: 'dust', r: s * 0.05 });
      }

      const fx = foot.x;
      const fy = foot.y;
      const runAmt = dance != null ? 1 : Math.min(1, an.speed / 2);
      const legSw = Math.sin(an.leg) * runAmt * s * 0.13;
      // 다리 + 신발
      ctx.strokeStyle = '#ffe0c2';
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      ctx.moveTo(fx - s * 0.1, fy - s * 0.3);
      ctx.lineTo(fx - s * 0.1 + legSw, fy - s * 0.05 - Math.max(0, Math.sin(an.leg)) * runAmt * s * 0.08);
      ctx.moveTo(fx + s * 0.1, fy - s * 0.3);
      ctx.lineTo(fx + s * 0.1 - legSw, fy - s * 0.05 - Math.max(0, -Math.sin(an.leg)) * runAmt * s * 0.08);
      ctx.stroke();
      for (const [dx, lift] of [[-s * 0.1 + legSw, Math.max(0, Math.sin(an.leg))], [s * 0.1 - legSw, Math.max(0, -Math.sin(an.leg))]]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(fx + dx, fy - s * 0.03 - lift * runAmt * s * 0.08, s * 0.1, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TEAM_COLOR[team];
        ctx.fillRect(fx + dx - s * 0.08, fy - s * 0.05 - lift * runAmt * s * 0.08, s * 0.16, s * 0.025);
      }

      // 몸통 (기울기 + 찌그러짐)
      const squash = swing * 0.14;
      const bodyCx = fx;
      const bodyCy = fy - s * ((sad ? 0.5 : 0.56) - windup * 0.07);
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(leanV + (sad ? 0.05 : 0));
      ctx.translate(-fx, -fy);
      ctx.fillStyle = '#1b1b2f';
      ctx.beginPath();
      ctx.ellipse(bodyCx, fy - s * 0.33, s * 0.2, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TEAM_COLOR[team];
      ctx.beginPath();
      ctx.ellipse(bodyCx, bodyCy, s * 0.25 * (1 + squash), s * 0.27 * (1 - squash), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.stroke();
      // 흰 줄무늬 + 등번호
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(bodyCx - s * 0.12, bodyCy - s * 0.24);
      ctx.lineTo(bodyCx, bodyCy - s * 0.12);
      ctx.lineTo(bodyCx + s * 0.12, bodyCy - s * 0.24);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.max(9, Math.min(s * 0.17, 36))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.slot[1], bodyCx, bodyCy + s * 0.05);
      ctx.restore();

      const shY = bodyCy - s * 0.15;
      const lean = leanV;
      // 반대쪽 팔 (균형 / 만세 / 축 처짐)
      const freeSide = hand && hand.x > fx ? -1 : 1;
      const sx0 = fx + freeSide * s * 0.24 + lean * s * 0.3;
      let fxh;
      let fyh;
      if (dance != null) {
        fxh = sx0 + freeSide * s * (0.1 + 0.15 * Math.cos(dance * 11));
        fyh = shY - s * 0.42 * (0.5 + 0.5 * Math.sin(dance * 11));
      } else if (happy) {
        fxh = sx0 + freeSide * s * 0.12;
        fyh = shY - s * 0.38 - Math.abs(Math.sin(celT * 7)) * s * 0.05;
      } else if (sad) {
        fxh = sx0 + freeSide * s * 0.04;
        fyh = shY + s * 0.28;
      } else {
        fxh = sx0 + freeSide * s * 0.16 + Math.sin(an.leg) * runAmt * s * 0.1;
        fyh = shY + s * 0.14;
      }
      ctx.strokeStyle = '#ffe0c2';
      ctx.lineWidth = s * 0.085;
      ctx.beginPath();
      ctx.moveTo(sx0, shY);
      ctx.lineTo(fxh, fyh);
      ctx.stroke();
      ctx.fillStyle = '#ffe0c2';
      ctx.beginPath();
      ctx.arc(fxh, fyh, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // 라켓 든 팔 (휘두를 때 크게 호를 그린다)
      if (hand) {
        let hx = hand.x;
        let hy = hand.y;
        if (dance != null) {
          // 라켓을 머리 위로 빙글빙글
          hx = fx - freeSide * s * 0.2 + Math.cos(dance * 9) * s * 0.4;
          hy = shY - s * 0.6 + Math.sin(dance * 9) * s * 0.15;
        } else if (happy) {
          hx = fx - freeSide * s * 0.36;
          hy = shY - s * 0.4;
        } else if (windup > 0) {
          // 백스윙: 라켓을 옆뒤로 크게 젖힌다
          const bxp = fx - freeSide * s * 0.6;
          const byp = shY + s * 0.12;
          hx = hx + (bxp - hx) * windup;
          hy = hy + (byp - hy) * windup;
        }
        const ax0 = fx - freeSide * s * 0.24 + lean * s * 0.3;
        ctx.strokeStyle = '#ffe0c2';
        ctx.lineWidth = s * 0.085;
        ctx.beginPath();
        ctx.moveTo(ax0, shY);
        ctx.quadraticCurveTo((ax0 + hx) / 2, Math.max(shY, hy) + s * 0.1, hx, hy);
        ctx.stroke();
        if (swing > 0.05) {
          // 스윙 궤적
          ctx.strokeStyle = `rgba(255,255,255,${swing * 0.7})`;
          ctx.lineWidth = Math.max(2, s * 0.04);
          ctx.beginPath();
          ctx.arc(ax0, shY, Math.hypot(hx - ax0, hy - shY), -Math.PI * 0.9, -Math.PI * 0.9 + swing * Math.PI * 0.8);
          ctx.stroke();
        }
        if (!ownRacket || dance != null || happy) this.drawPaddle(ctx, hx, hy, Math.max(7, s * 0.13), swing);
      }

      // 머리 (캐리커처) — 크게!
      const hr = s * (near ? 0.36 : 0.42);
      const headX = fx + lean * s * 0.6;
      const headY = bodyCy - s * 0.27 - hr * 0.85 + (sad ? s * 0.08 : 0) + Math.sin(t * 5 + p.slot.charCodeAt(1)) * s * 0.012;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(lean * 0.8 + (sad ? 0.25 * Math.sin(t * 2) : 0) + (happy ? Math.sin(celT * 14) * 0.15 : 0) + (dance != null ? Math.sin(dance * 13) * 0.35 : 0));
      if (p.img && p.img.complete && p.img.naturalWidth) {
        ctx.drawImage(p.img, -hr, -hr, hr * 2, hr * 2);
      } else {
        ctx.fillStyle = '#ffe0c2';
        ctx.beginPath();
        ctx.arc(0, 0, hr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // 필살기 에너지가 가득 차면 보라색 오라
      if ((p.energy || 0) >= 3 && dance == null) {
        ctx.strokeStyle = `rgba(199,125,255,${0.5 + 0.3 * Math.sin(t * 8)})`;
        ctx.lineWidth = Math.max(2, s * 0.03);
        ctx.beginPath();
        ctx.arc(headX, headY, hr * 1.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 표정 효과
      if (dance != null) {
        ctx.fillStyle = '#80ffaa';
        ctx.font = `900 ${Math.max(14, s * 0.18)}px system-ui`;
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
          const ph = (dance * 0.8 + i / 3) % 1;
          ctx.globalAlpha = 1 - ph;
          ctx.fillText(i % 2 ? '♪' : '♫', headX + (i - 1) * hr * 0.9 + Math.sin(dance * 5 + i) * 6, headY - hr - ph * s * 0.6);
        }
        ctx.globalAlpha = near ? 0.75 : 1;
      } else if (happy) {
        ctx.fillStyle = '#ffd60a';
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + (i * Math.PI * 2) / 3;
          this.star(ctx, headX + Math.cos(a) * hr * 1.3, headY + Math.sin(a) * hr * 0.6 - hr * 0.3, Math.max(4, s * 0.06));
        }
      } else if (sad) {
        ctx.fillStyle = '#74c0fc';
        const dy = ((t * 1.5) % 1) * s * 0.2;
        ctx.beginPath();
        ctx.ellipse(headX + hr * 0.85, headY - hr * 0.3 + dy, s * 0.03, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (an.speed > 2.5) {
        ctx.fillStyle = 'rgba(160,220,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(headX - freeSide * hr * 0.9, headY - hr * 0.4, s * 0.025, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 이름표 + 차례 표시
      ctx.globalAlpha = 1;
      ctx.font = `700 ${Math.max(11, Math.min(s * 0.11, 16))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.name;
      const tw = ctx.measureText(label).width + 12;
      const ly = headY - hr - 14;
      ctx.fillStyle = p.isTurn ? 'rgba(255,214,10,0.95)' : `${TEAM_DARK[team]}cc`;
      ctx.fillRect(headX - tw / 2, ly - 9, tw, 18);
      ctx.fillStyle = p.isTurn ? '#111' : '#fff';
      ctx.fillText(label, headX, ly);
      // 에너지 게이지 (작은 점 3개)
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < (p.energy || 0) ? '#c77dff' : 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(headX + (i - 1) * 9, ly + 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.isTurn) {
        const by = ly - 20 - Math.abs(Math.sin(t * 6)) * 8;
        ctx.fillStyle = '#ffd60a';
        ctx.beginPath();
        ctx.moveTo(headX - 9, by - 8);
        ctx.lineTo(headX + 9, by - 8);
        ctx.lineTo(headX, by + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    star(ctx, x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }

    /* ---------------- 전광판 (천장에 매달린 LED 스코어보드) ---------------- */
    jumboFlash(text, color) {
      this.jumbo.flash = { text, color: color || '#ffd60a', t: 0 };
    }

    ledPattern() {
      if (this._led) return this._led;
      const c = document.createElement('canvas');
      c.width = c.height = 4;
      const g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 0, 4, 4);
      g.clearRect(0, 0, 3, 3);
      this._led = this.ctx.createPattern(c, 'repeat');
      return this._led;
    }

    drawJumbotron(ctx, b, dt) {
      const W = Math.min(620, this.w - 24);
      const H = Math.round(Math.max(76, Math.min(98, W * 0.16)));
      const x0 = (this.w - W) / 2;
      const y0 = 8;
      const t = this.time;
      ctx.save();
      // 매달린 줄
      ctx.strokeStyle = 'rgba(200,200,220,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + W * 0.2, 0);
      ctx.lineTo(x0 + W * 0.2, y0);
      ctx.moveTo(x0 + W * 0.8, 0);
      ctx.lineTo(x0 + W * 0.8, y0);
      ctx.stroke();
      // 틀
      ctx.fillStyle = '#2b2d42';
      this.roundRect(ctx, x0 - 5, y0 - 4, W + 10, H + 8, 12);
      ctx.fill();
      ctx.fillStyle = '#04060f';
      this.roundRect(ctx, x0, y0, W, H, 8);
      ctx.fill();
      ctx.save();
      this.roundRect(ctx, x0, y0, W, H, 8);
      ctx.clip();

      const flash = this.jumbo.flash;
      if (flash) {
        flash.t += dt;
        if (flash.t > 1.6) this.jumbo.flash = null;
      }
      const ad = !flash && b.phase !== 'rally' && window.Ads ? Ads.jumbotron(Date.now()) : null;
      ctx.textBaseline = 'middle';
      if (flash) {
        // 큰 글씨 번쩍
        const on = Math.floor(flash.t * 8) % 2 === 0 || flash.t > 0.6;
        ctx.fillStyle = on ? flash.color : '#ffffff';
        ctx.textAlign = 'center';
        const scale = 1 + Math.max(0, 0.3 - flash.t);
        ctx.font = `italic 900 ${Math.round(H * 0.5 * scale)}px system-ui, sans-serif`;
        ctx.fillText(flash.text, x0 + W / 2, y0 + H / 2, W - 20);
      } else if (ad) {
        ctx.fillStyle = ad.bg;
        ctx.fillRect(x0, y0, W, H);
        const img = Ads.image(ad);
        let cx = x0 + W / 2;
        if (img) {
          const ih = H - 20;
          const iw = Math.min(W * 0.3, (img.width / img.height) * ih);
          ctx.drawImage(img, x0 + 14, y0 + 10, iw, ih);
          cx = x0 + 14 + iw + (W - iw - 14) / 2;
        }
        ctx.fillStyle = ad.fg;
        ctx.textAlign = 'center';
        ctx.font = `900 ${Math.round(H * 0.32)}px system-ui, sans-serif`;
        ctx.fillText(ad.title, cx, y0 + H * (ad.sub ? 0.38 : 0.5), W * 0.8);
        if (ad.sub) {
          ctx.font = `700 ${Math.round(H * 0.17)}px system-ui, sans-serif`;
          ctx.fillText(ad.sub, cx, y0 + H * 0.72, W * 0.8);
        }
        ctx.font = '700 10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('SPONSOR', x0 + W - 8, y0 + 10);
      } else {
        this.drawJumboScore(ctx, b, x0, y0, W, H);
      }
      // LED 도트 질감 + 반사광
      ctx.fillStyle = this.ledPattern();
      ctx.fillRect(x0, y0, W, H);
      const gl = ctx.createLinearGradient(0, y0, 0, y0 + H);
      gl.addColorStop(0, 'rgba(255,255,255,0.10)');
      gl.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(x0, y0, W, H);
      ctx.restore();
      ctx.restore();
    }

    drawJumboScore(ctx, b, x0, y0, W, H) {
      const t = this.time;
      const tickH = Math.round(H * 0.2);
      const mainH = H - tickH;
      const half = W / 2;
      const sides = [
        { s: b.left, x: x0, align: 'left' },
        { s: b.right, x: x0 + half, align: 'right' },
      ];
      for (const sd of sides) {
        const team = sd.s.team;
        const g = ctx.createLinearGradient(sd.x, 0, sd.x + half, 0);
        const col = TEAM_COLOR[team];
        if (sd.align === 'left') {
          g.addColorStop(0, col);
          g.addColorStop(0.55, `${col}33`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(0.45, `${col}33`);
          g.addColorStop(1, col);
        }
        ctx.fillStyle = g;
        ctx.fillRect(sd.x, y0, half, mainH);
        // 얼굴 + 이름
        const r = Math.min(mainH * 0.28, 22);
        sd.s.imgs.forEach((img, i) => {
          const cx = sd.align === 'left' ? sd.x + 12 + r + i * (r * 1.5) : sd.x + half - 12 - r - i * (r * 1.5);
          const cy = y0 + 8 + r;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
          if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          else {
            ctx.fillStyle = '#ffe0c2';
            ctx.fill();
          }
          ctx.restore();
        });
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(mainH * 0.15)}px system-ui`;
        ctx.textAlign = sd.align;
        const nx = sd.align === 'left' ? sd.x + 12 : sd.x + half - 12;
        const names = sd.s.names.join(' · ');
        ctx.fillText((sd.s.serving && sd.align === 'left' ? '● ' : '') + names + (sd.s.serving && sd.align === 'right' ? ' ●' : ''), nx, y0 + mainH * 0.8, half * 0.55);
        // 큰 점수 (LED 숫자)
        ctx.fillStyle = '#ffd60a';
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 12;
        ctx.font = `900 ${Math.round(mainH * 0.78)}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        const scx = sd.align === 'left' ? x0 + half * 0.78 : x0 + half + half * 0.22;
        const pop = b.pop && b.pop.team === team ? 1 + Math.max(0, 0.5 - b.pop.t) : 1;
        ctx.save();
        ctx.translate(scx, y0 + mainH * 0.54);
        ctx.scale(pop, pop);
        ctx.fillText(String(sd.s.score), 0, 0);
        ctx.restore();
        ctx.shadowBlur = 0;
      }
      // 가운데: 게임 정보
      ctx.fillStyle = '#04060fcc';
      ctx.fillRect(x0 + half - 34, y0 + 6, 68, mainH - 12);
      ctx.fillStyle = '#9aa5d1';
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(mainH * 0.14)}px system-ui`;
      ctx.fillText(`GAME ${b.gameNo}`, x0 + half, y0 + mainH * 0.28);
      ctx.fillStyle = '#06d6a0';
      ctx.font = `900 ${Math.round(mainH * 0.26)}px 'Courier New', monospace`;
      ctx.fillText(`${b.left.games}-${b.right.games}`, x0 + half, y0 + mainH * 0.62);
      // 아래 흐르는 글씨
      ctx.fillStyle = '#111426';
      ctx.fillRect(x0, y0 + mainH, W, tickH);
      ctx.fillStyle = b.tickerColor || '#ffb703';
      ctx.font = `700 ${Math.round(tickH * 0.68)}px system-ui`;
      ctx.textAlign = 'left';
      const text = b.ticker || '';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0 + mainH, W, tickH);
      ctx.clip();
      const tw = ctx.measureText(text).width + 80;
      if (tw - 80 < W - 20) {
        ctx.textAlign = 'center';
        ctx.fillText(text, x0 + W / 2, y0 + mainH + tickH / 2);
      } else {
        const off = (t * 70) % tw;
        ctx.fillText(text, x0 + 10 - off, y0 + mainH + tickH / 2);
        ctx.fillText(text, x0 + 10 - off + tw, y0 + mainH + tickH / 2);
      }
      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
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
        } else if (b.spin === 'top') {
          // 드라이브: 주황색 회오리 잔상
          ctx.strokeStyle = `rgba(255,150,40,${k * 0.6})`;
          ctx.lineWidth = Math.max(1.5, c.r * 1.6 * k);
        } else if (b.spin === 'back') {
          // 커트: 하늘색 둥실둥실 잔상
          ctx.strokeStyle = `rgba(120,200,255,${k * 0.5})`;
          ctx.lineWidth = Math.max(1, c.r * 1.3 * k);
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
      // 탑스핀 회오리: 잔상 위로 돌아가는 고리
      if (b.spin === 'top' && speed > 1.5) {
        ctx.strokeStyle = fx === 'fire' ? 'rgba(255,240,150,0.7)' : 'rgba(255,190,90,0.75)';
        ctx.lineWidth = 1.5;
        for (let i = n - 2; i > 0 && i > n - 9; i -= 2) {
          const c = this.trail[i];
          const rot = this.time * 25 + i;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.r * 1.6, c.r * 0.7, rot, 0, Math.PI * 1.3);
          ctx.stroke();
        }
        // 속도선
        if (n > 3) {
          const a = this.trail[n - 4];
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1;
          for (const off of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(p.x - (dx / len) * r * 2 + (-dy / len) * r * 1.8 * off, p.y - (dy / len) * r * 2 + (dx / len) * r * 1.8 * off);
            ctx.lineTo(p.x - (dx / len) * r * 7 + (-dy / len) * r * 1.8 * off, p.y - (dy / len) * r * 7 + (dx / len) * r * 1.8 * off);
            ctx.stroke();
          }
        }
      }
      if (b.special) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
        glow.addColorStop(0, 'rgba(230,180,255,0.95)');
        glow.addColorStop(0.4, 'rgba(160,80,255,0.5)');
        glow.addColorStop(1, 'rgba(120,0,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - r * 6, p.y - r * 6, r * 12, r * 12);
      }
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
        if (p.kind === 'dust') p.r += dt * 20;
        const k = 1 - p.age / p.life;
        if (k <= 0) continue;
        let col;
        if (p.kind === 'dust') col = `rgba(120,120,130,${k * 0.35})`;
        else if (p.kind === 'fire') col = k > 0.6 ? `rgba(255,240,150,${k})` : k > 0.3 ? `rgba(255,130,0,${k})` : `rgba(200,30,0,${k})`;
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

    // 내 라켓: 손가락/마우스를 따라다닌다. 칠 수 있을 때 공 주위에 맞는 범위를 보여준다
    drawRacket(ctx, rk) {
      ctx.save();
      const b = this.ballScreen;
      if (rk.active && b) {
        const d = Math.hypot(rk.x - b.x, rk.y - b.y);
        const inRange = d <= rk.radius;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = inRange ? '#ffd60a' : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rk.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // 라켓 → 공 방향 안내선
        if (!inRange && d < rk.radius * 6) {
          ctx.strokeStyle = 'rgba(255,214,10,0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rk.x, rk.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      // 휴대폰: 손가락 위치 표시 (라켓은 손가락 위에 뜬다)
      if (rk.touch && rk.x > -50) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(rk.x, rk.y + 70, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rk.x, rk.y + 48);
        ctx.lineTo(rk.x, rk.y + 22);
        ctx.stroke();
      }
      ctx.globalAlpha = rk.active ? 0.95 : 0.6;
      const tilt = rk.curl * 0.8;
      this.drawPaddle(ctx, rk.x, rk.y, rk.touch ? 26 : 22, tilt);
      ctx.globalAlpha = 1;
      if (rk.kind && rk.active) {
        let label = rk.armed ? '⚡ 필살기' : rk.kind === 'drive' ? '⬆ 드라이브' : '커트';
        if (Math.abs(rk.curl) > 0.35 && !rk.armed) label += rk.curl > 0 ? ' ↪' : ' ↩';
        ctx.font = '900 14px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(label, rk.x + 28, rk.y);
        ctx.fillStyle = rk.armed ? '#c77dff' : rk.kind === 'drive' ? '#ffa94d' : '#74c0fc';
        ctx.fillText(label, rk.x + 28, rk.y);
      }
      ctx.restore();
    }

    drawCrosshair(ctx, cur) {
      ctx.save();
      if (cur.kind) {
        // 지금 클릭하면 나갈 공 종류 미리보기
        const label = cur.armed ? '⚡ 필살기' : cur.kind === 'drive' ? '⬆ 드라이브' : '커트';
        ctx.font = '900 14px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(label, cur.x + 14, cur.y + 16);
        ctx.fillStyle = cur.armed ? '#c77dff' : cur.kind === 'drive' ? '#ffa94d' : '#74c0fc';
        ctx.fillText(label, cur.x + 14, cur.y + 16);
      }
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
      if (tm.contact) {
        // 라켓 모드: 공이 가장 높이 뜰 자리를 "여기!" 로 표시
        const g = this.project(tm.x, tm.y, tm.z);
        if (g && rem > -0.1) {
          const pulse = 1 + Math.sin(this.time * 10) * 0.12;
          const rr = Math.max(12, g.s * 0.07) * pulse;
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = rem < 0.15 ? 'rgba(255,123,0,0.95)' : 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(g.x, g.y, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '900 13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 3;
          ctx.strokeText('여기!', g.x, g.y - rr - 9);
          ctx.fillText('여기!', g.x, g.y - rr - 9);
        }
        ctx.restore();
        return;
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
