/* 클라이언트 메인: 홈/대기실 UI, 소켓 통신, 입력 처리, 렌더 루프 */
(function () {
  const P = window.PongPhysics;
  const { C } = P;
  const $ = (id) => document.getElementById(id);
  const socket = io();

  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* 용량 초과 등은 무시 */
      }
    },
  };

  const S = {
    config: { higgsfield: false },
    name: store.get('pp_name') || '',
    avatar: store.get('pp_avatar') || null,
    mode: 'singles',
    inRoom: false,
    myId: null,
    lobby: null,
    match: null,
    snap: null,
    snapAt: 0,
    imgs: {}, // slot -> Image
    cursor: { x: -100, y: -100, swing: 0 },
    hist: [],
    cutMode: false,
    cooldown: 0,
    token: store.get('pp_token') || null,
    roomCode: null,
    rtt: 0,
    aim: null,
  };

  // 재접속 시 같은 자리로 돌아오기 위한 개인 토큰
  if (!S.token) {
    S.token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set('pp_token', S.token);
  }

  /* ---------------- 화면 전환 ---------------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    if (id === 'game') arena.resize();
  }

  /* ---------------- 캐릭터 ---------------- */
  const avatarPreview = $('avatarPreview');
  function setAvatar(dataUrl, broadcast) {
    S.avatar = dataUrl;
    avatarPreview.src = dataUrl;
    store.set('pp_avatar', dataUrl);
    if (broadcast && S.inRoom) socket.emit('avatar', dataUrl);
  }
  if (!S.avatar) S.avatar = Caricature.defaultAvatar(Math.floor(Math.random() * 100));
  avatarPreview.src = S.avatar;
  $('nameInput').value = S.name;
  $('nameInput').addEventListener('input', (e) => {
    S.name = e.target.value.trim();
    store.set('pp_name', S.name);
  });

  fetch('/api/config')
    .then((r) => r.json())
    .then((c) => {
      S.config = c;
      $('avatarStatus').textContent = c.higgsfield
        ? '사진을 넣으면 Higgsfield AI 가 우스운 캐릭터로 바꿔줘요!'
        : '사진을 넣으면 우스운 큰머리 캐릭터로 변신! (Higgsfield 키 설정 시 AI 캐릭터)';
    })
    .catch(() => {});

  $('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const status = $('avatarStatus');
    const spinner = $('avatarSpinner');
    try {
      const raw = await Caricature.fileToDataUrl(file);
      const photo = await Caricature.shrinkPhoto(raw);
      // 1) 즉시: 브라우저 캐리커처
      setAvatar(await Caricature.localCaricature(photo), true);
      // 2) Higgsfield AI 캐리커처 → 완료되면 자동 교체 (게임 중이어도 반영)
      if (S.config.higgsfield) {
        spinner.classList.remove('hidden');
        status.textContent = 'Higgsfield AI 가 캐릭터를 그리는 중... (먼저 임시 캐릭터로 플레이 가능)';
        try {
          setAvatar(await Caricature.higgsfieldCaricature(photo), true);
          status.textContent = '✨ Higgsfield AI 캐릭터 완성! 자동으로 반영됐어요.';
        } catch (err) {
          status.textContent = `AI 생성 실패(${err.message}) → 기본 캐리커처를 사용합니다.`;
        } finally {
          spinner.classList.add('hidden');
        }
      } else {
        status.textContent = '캐리커처 완성! 마음에 안 들면 다른 사진을 올려보세요.';
      }
    } catch (err) {
      status.textContent = err.message;
    }
    e.target.value = '';
  });

  /* ---------------- 방 만들기 / 입장 ---------------- */
  document.querySelectorAll('#modeSeg button').forEach((b) =>
    b.addEventListener('click', () => {
      S.mode = b.dataset.mode;
      document.querySelectorAll('#modeSeg button').forEach((x) => x.classList.toggle('on', x === b));
    })
  );
  const params = new URLSearchParams(location.search);
  if (params.get('room')) $('codeInput').value = params.get('room').toUpperCase();

  function myName() {
    return S.name || '선수' + Math.floor(Math.random() * 90 + 10);
  }

  function onEntered(res, errEl) {
    if (!res || res.error) {
      $(errEl).textContent = (res && res.error) || '연결 실패';
      return;
    }
    Sfx.unlock();
    S.inRoom = true;
    S.roomCode = res.code;
    S.myId = res.you;
    $('banner').classList.add('hidden');
    S.lobby = res.lobby;
    S.match = res.match;
    history.replaceState(null, '', '?room=' + res.code);
    renderLobby();
    if (res.lobby.started && res.match && res.match.phase !== 'matchover') enterGame();
    else show('lobby');
  }

  $('createBtn').addEventListener('click', () => {
    $('homeError').textContent = '';
    socket.emit('create', { name: myName(), avatar: S.avatar, token: S.token, mode: S.mode, bestOf: $('bestOf').value }, (res) => onEntered(res, 'homeError'));
  });
  $('joinBtn').addEventListener('click', () => {
    $('homeError').textContent = '';
    const code = $('codeInput').value.trim().toUpperCase();
    if (code.length < 5) {
      $('homeError').textContent = '5자리 코드를 입력하세요.';
      return;
    }
    socket.emit('join', { code, name: myName(), avatar: S.avatar, token: S.token }, (res) => onEntered(res, 'homeError'));
  });
  $('codeInput').addEventListener('keydown', (e) => e.key === 'Enter' && $('joinBtn').click());

  function leave() {
    socket.emit('leave');
    S.inRoom = false;
    S.roomCode = null;
    S.lobby = null;
    S.match = null;
    S.snap = null;
    $('banner').classList.add('hidden');
    history.replaceState(null, '', location.pathname);
    show('home');
  }
  $('leaveBtn').addEventListener('click', leave);
  $('exitBtn').addEventListener('click', leave);
  $('copyLink').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?room=${S.lobby.code}`;
    try {
      await navigator.clipboard.writeText(url);
      $('copyLink').textContent = '✅ 복사됨!';
    } catch (e) {
      prompt('초대 링크', url);
    }
    setTimeout(() => ($('copyLink').textContent = '🔗 초대 링크 복사'), 1500);
  });
  $('startBtn').addEventListener('click', () => {
    $('lobbyError').textContent = '';
    socket.emit('start', null, (res) => res && res.error && ($('lobbyError').textContent = res.error));
  });

  /* ---------------- 대기실 ---------------- */
  function me() {
    return S.lobby && S.lobby.players.find((p) => p.id === S.myId);
  }
  function mySlot() {
    const m = me();
    return m ? m.slot : 'A1';
  }
  function myTeam() {
    return mySlot()[0];
  }
  function playerBySlot(slot) {
    return S.lobby && S.lobby.players.find((p) => p.slot === slot);
  }

  function updateImages() {
    if (!S.lobby) return;
    for (const p of S.lobby.players) {
      const src = p.avatar || Caricature.defaultAvatar(p.slot.charCodeAt(0) + p.slot.charCodeAt(1) * 3, p.isBot ? '#adb5bd' : null);
      p.avatar = src;
      const cur = S.imgs[p.slot];
      if (!cur || cur.src !== src) {
        const img = new Image();
        img.src = src;
        S.imgs[p.slot] = img;
      }
    }
  }

  function renderLobby() {
    const L = S.lobby;
    if (!L) return;
    updateImages();
    $('roomCode').textContent = L.code;
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
    $('netWarn').classList.toggle('hidden', !local);
    const isHost = L.hostId === S.myId;
    $('lobbyInfo').textContent = `${L.mode === 'doubles' ? '2:2 복식' : '1:1 단식'} · ${L.bestOf === 1 ? '1게임' : `${L.bestOf}게임 중 ${Math.floor(L.bestOf / 2) + 1}선승`} · ${isHost ? '당신이 방장입니다' : '방장이 시작하기를 기다리는 중'}`;
    const slots = L.mode === 'doubles' ? ['A1', 'A2', 'B1', 'B2'] : ['A1', 'B1'];
    $('slotsA').innerHTML = '';
    $('slotsB').innerHTML = '';
    for (const s of slots) {
      const p = playerBySlot(s);
      const el = document.createElement('div');
      el.className = 'slot' + (p ? '' : ' empty') + (p && p.id === S.myId ? ' me' : '');
      if (p) {
        const img = document.createElement('img');
        img.src = p.avatar;
        const who = document.createElement('div');
        who.className = 'who';
        const nm = document.createElement('b');
        nm.textContent = p.name + (p.id === S.myId ? ' (나)' : '');
        const sub = document.createElement('span');
        sub.className = 'hint';
        sub.textContent = (p.isBot ? '🤖 봇' : '🙂 플레이어') + (p.id === L.hostId ? ' · 👑 방장' : '');
        who.append(nm, sub);
        el.append(img, who);
        if (p.isBot && isHost) {
          const rm = document.createElement('button');
          rm.className = 'btn ghost small';
          rm.textContent = '봇 빼기';
          rm.onclick = () => socket.emit('removeBot', s);
          el.append(rm);
        }
      } else {
        const who = document.createElement('div');
        who.className = 'who';
        who.textContent = `빈 자리 (${s})`;
        el.append(who);
        const mv = document.createElement('button');
        mv.className = 'btn ghost small';
        mv.textContent = '여기로 이동';
        mv.onclick = () => socket.emit('slot', s);
        el.append(mv);
        if (isHost) {
          const bot = document.createElement('button');
          bot.className = 'btn ghost small';
          bot.textContent = '+ 봇';
          bot.onclick = () => socket.emit('addBot', s);
          el.append(bot);
        }
      }
      (s[0] === 'A' ? $('slotsA') : $('slotsB')).append(el);
    }
    const full = slots.every((s) => playerBySlot(s));
    $('startBtn').disabled = !isHost || !full;
    $('startBtn').textContent = isHost ? (full ? '경기 시작!' : '선수를 기다리는 중...') : '방장이 시작합니다';
  }

  socket.on('lobby', (L) => {
    if (!S.inRoom) return;
    // 아바타 생략 업데이트면 기존 아바타 유지
    if (S.lobby && L.players.some((p) => p.avatar === undefined)) {
      for (const p of L.players) {
        const old = S.lobby.players.find((q) => q.id === p.id);
        if (p.avatar === undefined) p.avatar = old ? old.avatar : null;
      }
    }
    S.lobby = L;
    renderLobby();
    if (document.getElementById('game').classList.contains('active')) renderScoreboard();
  });
  socket.on('avatar', ({ slot, avatar }) => {
    const p = playerBySlot(slot);
    if (p) p.avatar = avatar;
    updateImages();
    renderScoreboard();
  });

  /* ---------------- 경기 ---------------- */
  const canvas = $('canvas');
  const arena = new Arena(canvas);
  window.__arena = arena; // 디버그/자동 테스트용
  window.addEventListener('resize', () => arena.resize());

  function enterGame() {
    $('banner').classList.add('hidden');
    arena.setView(myTeam());
    show('game');
    renderScoreboard();
  }

  socket.on('started', () => {
    Sfx.whistle();
    enterGame();
    arena.addText('GAME START!', '#ffd60a', true);
  });

  function namesOf(team) {
    return S.lobby ? S.lobby.players.filter((p) => p.slot[0] === team).sort((a, b) => (a.slot > b.slot ? 1 : -1)) : [];
  }

  function renderScoreboard() {
    const m = S.match;
    const el = $('scoreboard');
    if (!m || !S.lobby) {
      el.innerHTML = '';
      return;
    }
    const mine = myTeam();
    const other = mine === 'A' ? 'B' : 'A';
    const side = (team, cls) => {
      const ps = namesOf(team);
      const heads = ps.map((p) => `<img src="${p.avatar || ''}" alt="">`).join('');
      const names = ps
        .map((p) => {
          const dot = m.server === p.slot && (m.phase === 'serve' || m.phase === 'rally') ? '<span class="serve-dot"></span>' : '';
          return `<span>${cls === 'b' ? '' : dot}${escapeHtml(p.name)}${cls === 'b' ? dot : ''}</span>`;
        })
        .join('');
      return `<div class="sb-team ${cls}" style="background:${TEAM_COLOR[team]}"><div class="sb-heads">${heads}</div><div class="sb-names">${names}</div></div>`;
    };
    el.innerHTML =
      side(mine, 'a') +
      `<div class="sb-mid"><div class="sb-points">${m.score[mine]}</div>` +
      `<div class="sb-games">GAME ${m.gameNo}<br>${m.games[mine]} - ${m.games[other]}${m.deuce ? '<br>듀스' : ''}</div>` +
      `<div class="sb-points">${m.score[other]}</div></div>` +
      side(other, 'b');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  socket.on('match', (m) => {
    S.match = m;
    renderScoreboard();
    const banner = $('banner');
    if (m.phase === 'matchover') {
      const won = m.winner === myTeam();
      const rows = m.history.map((g, i) => `<tr><td>${i + 1}게임</td><td>${g[myTeam()]}</td><td>${g[myTeam() === 'A' ? 'B' : 'A']}</td></tr>`).join('');
      const isHost = S.lobby && S.lobby.hostId === S.myId;
      banner.innerHTML =
        `<h2>${won ? '🏆 금메달!' : '🥈 은메달'}</h2><div>${won ? '우승을 축하합니다!' : '아쉽지만 멋진 경기였어요!'}</div>` +
        `<table><tr><th></th><th>우리</th><th>상대</th></tr>${rows}</table>` +
        `<div>${isHost ? '<button class="btn primary" id="againBtn">다시 하기</button> ' : ''}<button class="btn ghost" id="toLobby">대기실로</button></div>`;
      banner.classList.remove('hidden');
      const again = $('againBtn');
      if (again) again.onclick = () => socket.emit('start', null, (res) => res && res.error && alert(res.error));
      $('toLobby').onclick = () => {
        banner.classList.add('hidden');
        show('lobby');
      };
      arena.celebrate(m.winner);
      Sfx.cheer(true);
    } else if (m.phase === 'gameover') {
      const last = m.history[m.history.length - 1];
      banner.innerHTML = `<h2>GAME ${m.gameNo} 종료</h2><div style="font-size:28px;font-weight:800">${last[myTeam()]} : ${last[myTeam() === 'A' ? 'B' : 'A']}</div><div>세트 스코어 ${m.games[myTeam()]} - ${m.games[myTeam() === 'A' ? 'B' : 'A']} · 곧 다음 게임이 시작됩니다</div>`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  });

  socket.on('state', (st) => {
    S.snap = st;
    S.snapAt = performance.now();
  });

  function ballFromSnap(st) {
    const b = P.createBall();
    [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.ax, b.az] = st.ball;
    b.spin = st.spin;
    b.side = st.side;
    return b;
  }

  let ballRot = 0;
  function predictedBall() {
    const st = S.snap;
    if (!st) return null;
    const b = ballFromSnap(st);
    if (!st.held) {
      let el = Math.min(0.12, (performance.now() - S.snapAt) / 1000);
      while (el > 1e-4) {
        const d = Math.min(1 / 120, el);
        P.step(b, d);
        el -= d;
      }
      if (b.z < C.FLOOR_Z) b.z = C.FLOOR_Z;
    }
    b.rot = ballRot;
    return b;
  }

  socket.on('fx', (e) => {
    if (e.type === 'hit') {
      const pr = arena.project(e.x, e.y, e.z);
      if (pr) arena.impact(pr.x, pr.y, e.tier);
      Sfx.hit(e.tier);
      const kind = e.serve ? '서브' : e.kind === 'drive' ? '드라이브' : '커트';
      const curve = Math.abs(e.curve) > 0.45 ? (e.curve > 0 ? ' ↪커브' : ' ↩커브') : '';
      const x = pr ? pr.x : null;
      const y = pr ? pr.y - 50 : null;
      if (e.tier === 'fire') arena.addText('🔥 PERFECT ' + kind + '!', '#ff7b00', true);
      else if (e.tier === 'gold') arena.addText('✨ GREAT ' + kind + curve, '#ffd60a', false, x, y);
      else arena.addText(kind + curve, '#ffffff', false, x, y);
      const p = playerBySlot(e.slot);
      if (p) p.swingT = performance.now();
      if (e.slot === mySlot() && e.tier === 'none') {
        // 내 타이밍이 얼마나 어긋났는지 알려준다
        const ms = Math.round(e.diff * 1000);
        feedback(ms < 0 ? `조금 빨랐어요 (${-ms}ms)` : `조금 늦었어요 (${ms}ms)`, '#cfd6ff');
      }
    } else if (e.type === 'whiff') {
      Sfx.whiff();
      feedback(e.diff < 0 ? '헛스윙! 너무 빨라요' : '헛스윙! 너무 늦었어요', '#adb5bd');
    } else if (e.type === 'bounce') {
      arena.bounceFx(e.x, e.y);
      Sfx.bounce();
    } else if (e.type === 'net') {
      Sfx.net();
      arena.addText(e.touch ? '네트 맞고 넘어감!' : 'NET!', '#ffb3c1', false);
    } else if (e.type === 'toss') {
      Sfx.toss();
    }
  });

  socket.on('point', (e) => {
    if (e.let) {
      arena.addText('LET', '#ffffff', true);
      S.pointMsg = e.reason;
      return;
    }
    const mine = e.team === myTeam();
    arena.celebrate(e.team);
    Sfx.cheer(e.fx === 'fire');
    arena.addText(mine ? '득점! 🎉' : '실점 😵', mine ? '#06d6a0' : '#ff6b6b', true);
    S.pointMsg = e.reason;
  });

  /* ---------------- 입력 ----------------
   * 캐릭터는 공을 따라 자동으로 움직인다.
   * 플레이어는 (1) 마우스로 상대 코트의 노릴 곳을 가리키고 (2) 타이밍에 맞춰 클릭한다.
   * 클릭 순간 마우스를 좌우로 휘두르면 커브, 위로 휘두르면 더 빠른 공.
   */
  function updateCursor(x, y) {
    const t = performance.now();
    S.cursor.x = x;
    S.cursor.y = y;
    S.hist.push({ t, x, y });
    while (S.hist.length && t - S.hist[0].t > 140) S.hist.shift();
  }

  function swingVector() {
    const h = S.hist;
    if (h.length < 2) return { sx: 0, sy: 0 };
    const a = h[0];
    const b = h[h.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    return { sx: P.clamp((b.x - a.x) / dt / 1300, -1, 1), sy: P.clamp(-(b.y - a.y) / dt / 1300, -1, 1) };
  }

  // 지금 서버 시각 추정 (마지막 상태의 서버 시각 + 경과 시간)
  function serverNow() {
    return S.snap ? S.snap.t + (performance.now() - S.snapAt) : 0;
  }

  // 마우스 위치 → 상대 코트 위 조준점
  function aimPoint() {
    const team = myTeam();
    const dir = team === 'A' ? 1 : -1;
    const p = arena.unproject(S.cursor.x, S.cursor.y, 0);
    return {
      x: P.clamp(p.x, -C.HW + 0.08, C.HW - 0.08),
      y: dir * P.clamp(p.y * dir, 0.3, C.HL - 0.08),
    };
  }

  function myIdeal() {
    const st = S.snap;
    return st && st.ideal && st.ideal.slot === mySlot() ? st.ideal : null;
  }

  function isMyServeHold() {
    const st = S.snap;
    return st && st.phase === 'serve' && st.server === mySlot() && st.held;
  }

  function feedback(text, color) {
    arena.addText(text, color, false, arena.w / 2, arena.h * 0.62);
  }

  function attempt(kind) {
    Sfx.unlock();
    const st = S.snap;
    if (!st || !S.match) return;
    if (isMyServeHold()) {
      socket.emit('input', { type: 'toss' });
      return;
    }
    const ideal = myIdeal();
    if (!ideal || S.cooldown > 0) return;
    const ct = serverNow();
    const diff = (ct - ideal.at) / 1000;
    S.cooldown = 0.35;
    S.swingAnim = 1;
    if (diff < -P.TIMING_WINDOW) {
      Sfx.whiff();
      feedback('너무 빨라요!', '#adb5bd');
      return;
    }
    if (diff > P.TIMING_WINDOW) {
      Sfx.whiff();
      feedback('너무 늦었어요!', '#adb5bd');
      return;
    }
    const sw = swingVector();
    const aim = aimPoint();
    socket.emit('input', { type: 'hit', kind, aimX: aim.x, aimY: aim.y, swingX: sw.sx, swingY: Math.max(0.35, sw.sy), ct });
  }

  canvas.addEventListener('mousemove', (e) => updateCursor(e.clientX, e.clientY));
  canvas.addEventListener('mousedown', (e) => {
    updateCursor(e.clientX, e.clientY);
    attempt(e.button === 2 || e.shiftKey || S.cutMode ? 'cut' : 'drive');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      updateCursor(t.clientX, t.clientY);
      attempt(S.cutMode ? 'cut' : 'drive');
    },
    { passive: false }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      updateCursor(t.clientX, t.clientY);
    },
    { passive: false }
  );
  window.addEventListener('keydown', (e) => {
    if (!$('game').classList.contains('active')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      attempt(e.shiftKey || S.cutMode ? 'cut' : 'drive');
    }
  });
  $('cutToggle').addEventListener('click', () => {
    S.cutMode = !S.cutMode;
    $('cutToggle').textContent = `커트 모드: ${S.cutMode ? 'ON' : 'OFF'}`;
  });
  $('muteBtn').addEventListener('click', () => ($('muteBtn').textContent = Sfx.toggle() ? '🔇' : '🔊'));

  function turnHint() {
    const st = S.snap;
    const m = S.match;
    const el = $('turnHint');
    if (!st || !m) return;
    const slot = mySlot();
    let text = '';
    let mine = false;
    const nm = (s) => (playerBySlot(s) ? playerBySlot(s).name : s);
    if (st.phase === 'serve') {
      if (st.server === slot) {
        mine = true;
        text = st.held ? '🏓 내 서브! 노릴 곳을 가리키고 클릭(스페이스)으로 토스' : '⬇ 원이 공에 딱 맞을 때 클릭!';
      } else text = `${nm(st.server)} 서브 준비 중 → 리시브: ${nm(m.receiver)}`;
    } else if (st.phase === 'rally') {
      if (st.next === slot) {
        mine = true;
        text = '🎯 노릴 곳을 가리키고, 줄어드는 원이 공에 닿는 순간 클릭!';
      } else if (st.next[0] === slot[0]) text = `파트너 ${nm(st.next)} 차례 (복식은 번갈아 칩니다)`;
      else text = `상대 ${nm(st.next)} 차례 — 다음 공 준비!`;
    } else if (st.phase === 'point') text = S.pointMsg || '';
    el.textContent = text;
    el.classList.toggle('mine', mine);
  }

  /* ---------------- 렌더 루프 ---------------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if ($('game').classList.contains('active') && S.lobby) {
      S.cooldown = Math.max(0, S.cooldown - dt);
      const st = S.snap;
      if (st) ballRot += dt * (st.spin === 'top' ? 25 : st.spin === 'back' ? -25 : 6);
      const ball = st ? predictedBall() : null;
      const players = S.lobby.players.map((p) => {
        const pd = st && st.paddles[p.slot];
        const swingAge = p.swingT ? (now - p.swingT) / 1000 : 9;
        return {
          slot: p.slot,
          name: p.name + (p.away ? ' (재접속 대기)' : ''),
          img: S.imgs[p.slot],
          paddle: pd ? { x: pd[0], y: pd[1], z: pd[2] } : null,
          isMe: p.id === S.myId,
          isTurn: st && ((st.phase === 'serve' && st.server === p.slot) || (st.phase === 'rally' && st.next === p.slot)),
          swing: swingAge < 0.25 ? Math.sin((swingAge / 0.25) * Math.PI) : 0,
        };
      });
      if (S.swingAnim > 0) S.swingAnim = Math.max(0, S.swingAnim - dt * 4);
      const ideal = myIdeal();
      const showAim = st && ((st.phase === 'rally' && st.next === mySlot()) || (st.phase === 'serve' && st.server === mySlot()));
      arena.draw(
        {
          ball,
          fx: st ? st.fx : 'none',
          players,
          cursor: { x: S.cursor.x, y: S.cursor.y },
          aim: showAim ? aimPoint() : null,
          timing: ideal ? { remain: (ideal.at - serverNow()) / 1000, x: ideal.x, y: ideal.y, z: ideal.z, window: P.TIMING_WINDOW } : null,
        },
        dt
      );
      turnHint();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // 디버그/자동 테스트용
  window.__pp = {
    remain: () => {
      const i = myIdeal();
      return i ? (i.at - serverNow()) / 1000 : null;
    },
    holdServe: () => !!isMyServeHold(),
  };

  /* ---------------- 인터넷 연결 관리 ---------------- */
  setInterval(() => {
    const t0 = performance.now();
    socket.emit('ping2', null, () => {
      S.rtt = Math.round(performance.now() - t0);
      const el = $('pingInfo');
      if (el) {
        el.textContent = `📶 ${S.rtt}ms`;
        el.style.color = S.rtt < 100 ? '#06d6a0' : S.rtt < 200 ? '#ffd60a' : '#ff6b6b';
      }
    });
  }, 2000);

  socket.on('disconnect', () => {
    if (!S.roomCode) return;
    const banner = $('banner');
    banner.innerHTML = '<h2>재연결 중...</h2><div>인터넷 연결이 잠시 끊겼어요. 다시 연결되면 같은 자리로 돌아갑니다. (그동안은 봇이 대신 칩니다)</div>';
    banner.classList.remove('hidden');
  });

  socket.on('connect', () => {
    if (!S.roomCode) return;
    socket.emit('join', { code: S.roomCode, name: myName(), avatar: S.avatar, token: S.token }, (res) => {
      if (!res || res.error) {
        S.inRoom = false;
        S.roomCode = null;
        $('banner').classList.add('hidden');
        $('homeError').textContent = '게임장에 다시 들어가지 못했습니다: ' + ((res && res.error) || '연결 실패');
        show('home');
        return;
      }
      onEntered(res, 'homeError');
    });
  });
})();
