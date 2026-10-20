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
    racket: { x: -100, y: -100 },
    contactFor: null,
    hist: [],
    specialArmed: false,
    special: null,
    touch: null,
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

  Ads.init();

  /* ---------------- 앱 설치 (홈 화면에 추가) ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    // 안드로이드/PC 크롬: 설치 버튼을 직접 보여준다
    e.preventDefault();
    installPrompt = e;
    if (!standalone) $('installBtn').classList.remove('hidden');
  });
  $('installBtn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    $('installBtn').classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));
  // 아이폰/아이패드 Safari 는 자동 설치 버튼이 없어서 방법을 안내한다
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && !standalone) $('iosInstall').classList.remove('hidden');

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
    else {
      Ads.renderLobbyBanner();
      show('lobby');
    }
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
    Music.stop();
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
    Music.start();
    syncMusicBtn();
  }

  function syncMusicBtn() {
    $('musicBtn').textContent = Music.enabled ? '🎵' : '🎵̸';
    $('musicBtn').style.opacity = Music.enabled ? '1' : '0.5';
  }
  $('musicBtn').addEventListener('click', () => {
    Sfx.unlock();
    Music.toggle();
    syncMusicBtn();
  });

  // 전광판에 보여줄 정보
  function jumboBoard(st) {
    const m = S.match;
    if (!m || !S.lobby) return null;
    const mine = myTeam();
    const other = mine === 'A' ? 'B' : 'A';
    const side = (team) => {
      const ps = namesOf(team);
      return {
        team,
        names: ps.map((p) => p.name),
        imgs: ps.map((p) => S.imgs[p.slot]),
        score: m.score[team],
        games: m.games[team],
        serving: m.server && m.server[0] === team && (m.phase === 'serve' || m.phase === 'rally'),
      };
    };
    // 점수가 바뀌면 숫자가 톡 튀어나오게
    const sc = `${m.score.A}:${m.score.B}`;
    if (S.lastScore !== sc) {
      if (S.lastScore) {
        const [a, b] = S.lastScore.split(':').map(Number);
        S.pop = { team: m.score.A > a ? 'A' : m.score.B > b ? 'B' : null, at: performance.now() };
      }
      S.lastScore = sc;
    }
    let ticker = '';
    let tickerColor = '#ffb703';
    const nm = (slot) => (playerBySlot(slot) ? playerBySlot(slot).name : slot);
    const need = Math.floor(m.bestOf / 2) + 1;
    const lead = m.score.A === m.score.B ? null : m.score.A > m.score.B ? 'A' : 'B';
    const atPoint = lead && m.score[lead] >= 10;
    if (m.phase === 'point' && S.pointMsg) ticker = S.pointMsg;
    else if (atPoint && m.games[lead] === need - 1) {
      ticker = `🏆 MATCH POINT — ${namesOf(lead).map((p) => p.name).join(' · ')}`;
      tickerColor = '#ff6b6b';
    } else if (atPoint) {
      ticker = `⭐ GAME POINT — ${namesOf(lead).map((p) => p.name).join(' · ')}`;
      tickerColor = '#ffd60a';
    } else if (m.deuce) {
      ticker = '🔥 DEUCE! 2점 차가 나야 이깁니다';
      tickerColor = '#ff7b00';
    } else if (m.phase === 'serve') ticker = `🏓 서브 ${nm(m.server)} → 리시브 ${nm(m.receiver)}`;
    else ticker = `${m.bestOf === 1 ? '단판' : `${m.bestOf}게임 중 ${need}선승`} · ${S.lobby.mode === 'doubles' ? '2:2 복식' : '1:1 단식'} · PING PONG ARENA`;
    return {
      left: side(mine),
      right: side(other),
      gameNo: m.gameNo,
      phase: st ? st.phase : m.phase,
      ticker,
      tickerColor,
      pop: S.pop ? { team: S.pop.team, t: (performance.now() - S.pop.at) / 1000 } : null,
    };
  }

  socket.on('started', () => {
    S.special = null;
    S.specialArmed = false;
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
        Music.stop();
        Ads.renderLobbyBanner();
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
    b.special = !!st.sp;
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
      if (e.special) {
        arena.addText(e.kind === 'smash' ? '💥 SUPER SMASH!!' : '🌪 SUPER DRIVE!!', '#c77dff', true);
        arena.shake = 0.7;
        Sfx.hit('fire');
      } else if (e.tier === 'fire') {
        arena.addText('🔥 PERFECT ' + kind + '!', '#ff7b00', true);
        arena.jumboFlash('🔥 PERFECT!', '#ff7b00');
      }
      else if (e.tier === 'gold') arena.addText('✨ GREAT ' + kind + curve, '#ffd60a', false, x, y);
      else arena.addText(kind + curve, '#ffffff', false, x, y);
      const p = playerBySlot(e.slot);
      if (p) {
        p.swingT = performance.now();
        p.lastTier = e.special ? 'special' : e.tier;
      }
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

  socket.on('special', (e) => {
    S.special = { slot: e.slot, kind: e.kind, at: performance.now(), dur: e.ms };
    Sfx.special();
    Music.swell();
    arena.jumboFlash('⚡ 필살기!', '#c77dff');
  });

  socket.on('point', (e) => {
    if (e.let) {
      arena.addText('LET', '#ffffff', true);
      S.pointMsg = e.reason;
      return;
    }
    const mine = e.team === myTeam();
    arena.celebrate(e.team);
    S.celebrate = { team: e.team, at: performance.now() };
    Sfx.cheer(e.fx === 'fire');
    Music.swell();
    const scorers = namesOf(e.team).map((p) => p.name).join(' · ');
    arena.jumboFlash(`POINT! ${scorers}`, TEAM_COLOR[e.team]);
    arena.addText(mine ? '득점! 🎉' : '실점 😵', mine ? '#06d6a0' : '#ff6b6b', true);
    S.pointMsg = e.reason;
  });

  /* ---------------- 입력 ----------------
   * 라켓이 손가락(폰)/마우스(PC)를 따라 움직이고, 캐릭터는 라켓 쪽으로 달려간다.
   * 라켓을 공에 갖다 대면 친다 (클릭 필요 없음).
   *  - 맞는 순간 앞(위)으로 밀고 있으면 드라이브, 가만히 대면 커트(블록)
   *  - 손가락/마우스를 곡선으로 움직이면 공이 그 방향으로 휘어 들어간다
   */
  const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const TOUCH_LIFT = 70; // 손가락에 라켓이 가리지 않도록 위로 띄운다

  function updateCursor(x, y) {
    const t = performance.now();
    S.cursor.x = x;
    S.cursor.y = y;
    S.hist.push({ t, x, y });
    while (S.hist.length && t - S.hist[0].t > 320) S.hist.shift();
  }

  // 최근 140ms 동안의 라켓 이동 속도 (위로 = +sy)
  function swingVector() {
    const t = performance.now();
    const h = S.hist.filter((p) => t - p.t <= 140);
    if (h.length < 2) return { sx: 0, sy: 0 };
    const a = h[0];
    const b = h[h.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    return { sx: P.clamp((b.x - a.x) / dt / 1300, -1, 1), sy: P.clamp(-(b.y - a.y) / dt / 1300, -1, 1) };
  }

  // 최근 궤적이 얼마나 휘었는지 (+ 오른쪽으로 휨, - 왼쪽으로 휨)
  function curlOf() {
    const t = performance.now();
    const h = S.hist.filter((p) => t - p.t <= 300);
    if (h.length < 4) return 0;
    const a = h[0];
    const m = h[Math.floor(h.length / 2)];
    const b = h[h.length - 1];
    const v1 = { x: m.x - a.x, y: m.y - a.y };
    const v2 = { x: b.x - m.x, y: b.y - m.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    if (l1 < 4 || l2 < 4) return 0;
    const turn = (v1.x * v2.y - v1.y * v2.x) / (l1 * l2); // 회전 방향(sin)
    return P.clamp(turn * Math.min(1, (l1 + l2) / 90) * 1.4, -1, 1);
  }

  // 지금 서버 시각 추정 (마지막 상태의 서버 시각 + 경과 시간)
  function serverNow() {
    return S.snap ? S.snap.t + (performance.now() - S.snapAt) : 0;
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

  const DRIVE_PUSH = 0.22;
  function shotKind(sw) {
    return sw.sy > DRIVE_PUSH ? 'drive' : 'cut';
  }

  function myEnergy() {
    const st = S.snap;
    return st && st.energy ? st.energy[mySlot()] || 0 : 0;
  }

  function toggleSpecial() {
    Sfx.unlock();
    if (myEnergy() < 3) return;
    S.specialArmed = !S.specialArmed;
    if (S.specialArmed) {
      Sfx.toss();
      feedback('⚡ 필살기 장전! 다음 공에 라켓을 갖다 대세요', '#c77dff');
    }
  }

  // 지금 칠 수 있는 공인가?
  function canContact() {
    const st = S.snap;
    if (!st || !S.match) return false;
    const ideal = myIdeal();
    if (!ideal) return false;
    if (st.phase === 'serve') return st.server === mySlot() && st.tossed && !st.held;
    return st.phase === 'rally' && st.canHit && st.next === mySlot();
  }

  function hitRadius() {
    const bs = arena.ballScreen;
    const r = bs ? bs.r : 5;
    return IS_TOUCH ? Math.max(46, r * 6.5) : Math.max(34, r * 5);
  }

  // 매 프레임: 라켓이 공에 닿았는지 검사
  function checkContact() {
    if (!canContact()) return;
    const ideal = myIdeal();
    if (S.contactFor === ideal.at) return; // 같은 공은 한 번만
    const bs = arena.ballScreen;
    if (!bs) return;
    const R = hitRadius();
    const d = Math.hypot(S.racket.x - bs.x, S.racket.y - bs.y);
    if (d > R) return;
    S.contactFor = ideal.at;
    const sw = swingVector();
    const curl = curlOf();
    const special = !!S.specialArmed && myEnergy() >= 3 && S.snap.phase === 'rally';
    if (special) S.specialArmed = false;
    S.swingAnim = 1;
    socket.emit('input', {
      type: 'hit',
      mode: 'contact',
      kind: shotKind(sw),
      acc: 1 - d / R,
      swingX: sw.sx,
      swingY: Math.max(0.3, sw.sy),
      curl,
      ct: serverNow(),
      special,
    });
  }

  // 라켓 화면 위치 → 월드 좌표로 서버에 보내기 (캐릭터가 따라 움직임)
  function sendPaddle(now, ball) {
    if (now - (S.lastPaddleSend || 0) < 50 || !S.match) return;
    S.lastPaddleSend = now;
    const sgn = myTeam() === 'A' ? -1 : 1;
    const z = ball && canContact() ? P.clamp(ball.z, -0.4, 0.9) : 0.25;
    const p = arena.unproject(S.racket.x, S.racket.y, z);
    const y = sgn * P.clamp(p.y * sgn, 0.05, 4.2);
    const x = P.clamp(p.x, -2.6, 2.6);
    S.myPaddle = { x, y, z };
    socket.emit('input', { type: 'paddle', x, y, z });
  }

  function tossIfServing() {
    Sfx.unlock();
    if (isMyServeHold()) socket.emit('input', { type: 'toss' });
  }

  function moveRacket(x, y) {
    S.racket.x = x;
    S.racket.y = y;
    updateCursor(x, y);
  }

  canvas.addEventListener('mousemove', (e) => moveRacket(e.clientX, e.clientY));
  canvas.addEventListener('mousedown', (e) => {
    moveRacket(e.clientX, e.clientY);
    if (e.button === 2) return toggleSpecial(); // 오른쪽 클릭 = 필살기 장전
    tossIfServing();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      moveRacket(t.clientX, t.clientY - TOUCH_LIFT);
      tossIfServing();
    },
    { passive: false }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      moveRacket(t.clientX, t.clientY - TOUCH_LIFT);
    },
    { passive: false }
  );
  window.addEventListener('keydown', (e) => {
    if (!$('game').classList.contains('active')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      tossIfServing();
    } else if (e.code === 'KeyE' || e.code === 'KeyQ') {
      toggleSpecial();
    }
  });
  $('specialBtn').addEventListener('click', toggleSpecial);

  function updateEnergyUi() {
    const n = myEnergy();
    document.querySelectorAll('#energyBox .pips i').forEach((el, i) => el.classList.toggle('on', i < n));
    const btn = $('specialBtn');
    btn.classList.toggle('hidden', n < 3);
    btn.classList.toggle('armed', !!S.specialArmed);
    btn.textContent = S.specialArmed ? '⚡ 장전됨! 라켓을 공에!' : IS_TOUCH ? '⚡ 필살기' : '⚡ 필살기 (E)';
    if (n < 3) S.specialArmed = false;
  }
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
        text = st.held ? (IS_TOUCH ? '🏓 내 서브! 화면을 탭해서 토스' : '🏓 내 서브! 클릭(스페이스)으로 토스') : '⬇ 떨어지는 공에 라켓을 갖다 대세요! (위로 밀면 드라이브)';
      } else text = `${nm(st.server)} 서브 준비 중 → 리시브: ${nm(m.receiver)}`;
    } else if (st.phase === 'rally') {
      if (st.next === slot) {
        mine = true;
        text = S.specialArmed ? '⚡ 필살기 장전! 라켓을 공에 갖다 대세요!' : '🏓 라켓을 공으로! ⬆위로 밀며 치면 드라이브 · 대기만 하면 커트 · 곡선으로 밀면 커브';
      } else if (st.next[0] === slot[0]) text = `파트너 ${nm(st.next)} 차례 (복식은 번갈아 칩니다)`;
      else text = `상대 ${nm(st.next)} 차례 — 다음 공 준비!`;
    } else if (st.phase === 'point') text = S.pointMsg || '';
    else if (st.phase === 'special') text = `⚡ ${nm(st.special ? st.special.slot : '')} 필살기 발동!`;
    el.textContent = text;
    el.classList.toggle('mine', mine);
  }

  // 칠 순간 0.5초 전부터 라켓을 뒤로 빼는 준비 동작
  function windupOf(remain) {
    return remain > 0 && remain < 0.5 ? 1 - remain / 0.5 : 0;
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
      sendPaddle(now, ball);
      const players = S.lobby.players.map((p) => {
        let pd = st && st.paddles[p.slot];
        if (p.id === S.myId && S.myPaddle) pd = [S.myPaddle.x, S.myPaddle.y, S.myPaddle.z];
        const swingAge = p.swingT ? (now - p.swingT) / 1000 : 9;
        return {
          slot: p.slot,
          name: p.name + (p.away ? ' (재접속 대기)' : ''),
          img: S.imgs[p.slot],
          paddle: pd ? { x: pd[0], y: pd[1], z: pd[2] } : null,
          isMe: p.id === S.myId,
          isTurn: st && ((st.phase === 'serve' && st.server === p.slot) || (st.phase === 'rally' && st.next === p.slot)),
          swing: swingAge < 0.3 ? Math.sin((swingAge / 0.3) * Math.PI) : 0,
          bigSwing: swingAge < 0.5 && (p.lastTier === 'fire' || p.lastTier === 'special') ? 1 - swingAge / 0.5 : 0,
          windup: st && st.ideal && st.ideal.slot === p.slot ? windupOf((st.ideal.at - serverNow()) / 1000) : 0,
          energy: st && st.energy ? st.energy[p.slot] || 0 : 0,
        };
      });
      if (S.swingAnim > 0) S.swingAnim = Math.max(0, S.swingAnim - dt * 4);
      Music.intensity = S.match && S.match.deuce ? 1 : 0;
      const ideal = myIdeal();
      const myTurnNow = canContact();
      arena.draw(
        {
          ball,
          fx: st ? st.fx : 'none',
          players,
          racket: {
            x: S.racket.x,
            y: S.racket.y,
            kind: ideal && !isMyServeHold() ? shotKind(swingVector()) : null,
            curl: ideal ? curlOf() : 0,
            armed: S.specialArmed,
            active: myTurnNow,
            radius: hitRadius(),
            touch: IS_TOUCH,
          },
          timing: ideal ? { remain: (ideal.at - serverNow()) / 1000, x: ideal.x, y: ideal.y, z: ideal.z, window: P.TIMING_WINDOW, contact: true } : null,
          board: jumboBoard(st),
          special: S.special && now - S.special.at < S.special.dur ? { slot: S.special.slot, kind: S.special.kind, t: (now - S.special.at) / 1000, dur: S.special.dur / 1000 } : null,
          celebrate: S.celebrate ? { team: S.celebrate.team, t: (now - S.celebrate.at) / 1000 } : null,
        },
        dt
      );
      checkContact();
      turnHint();
      updateEnergyUi();
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
    canContact: () => canContact(),
    ball: () => arena.ballScreen || null,
    state: () => ({ phase: S.snap && S.snap.phase, energy: myEnergy(), armed: !!S.specialArmed }),
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
