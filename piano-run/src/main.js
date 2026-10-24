import './style.css'
import { CHARS, charIcon } from './chars.js'
import { SONGS, LEVEL_INFO, makeChart } from './songs.js'
import { PianoGame } from './game.js'
import { ARR_INFO } from './band.js'
import { Scene, THEMES } from './scene.js'
import { unlockAudio, setSound, isSoundOn, sfx } from './music.js'
import { canRace, online, localTest, joinRoom, newCode, hostOf } from './net.js'
import { makeChat } from './chat.js'
import { local, session } from './store.js'
import { saveRun, topScores, topPoints, myBestLocal } from './rank.js'

const $ = (s) => document.querySelector(s)
const cv = $('#cv')
const songById = (id) => SONGS.find((s) => s.id === id) || SONGS[0]

// ---------- 내 정보 ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
let saved = {}
try {
  saved = JSON.parse(local.get('piano.profile') || '{}') || {}
} catch {
  saved = {}
}
// 슬라임 게임에서 쓰던 이름이 있으면 그대로
let slimeName = ''
try {
  slimeName = JSON.parse(local.get('slime.profile') || '{}')?.name || ''
} catch {
  // 없음
}
const profile = {
  id: session.get('piano.id') || uid(),
  name: saved.name || slimeName || '',
  char: CHARS.some((c) => c.id === saved.char) ? saved.char : CHARS[0].id,
  theme: THEMES[saved.theme] ? saved.theme : 'spring',
  song: saved.song || SONGS[0].id,
  level: saved.level || 1,
}
session.set('piano.id', profile.id)
const saveProfile = () =>
  local.set('piano.profile', JSON.stringify({ name: profile.name, char: profile.char, theme: profile.theme, song: profile.song, level: profile.level }))

// ---------- 화면 ----------
const screens = ['#title', '#songs', '#lobby', '#rank', '#how', '#result']
function show(id) {
  screens.forEach((s) => $(s).classList.toggle('hidden', s !== id))
}

let toastTimer
function toast(text, ms = 1800) {
  const el = $('#toast')
  el.textContent = text
  el.classList.remove('hidden')
  el.style.animation = 'none'
  void el.offsetWidth
  el.style.animation = ''
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms)
}

const wake = () => unlockAudio()
;['pointerdown', 'touchend', 'click'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }))
document.addEventListener('click', (e) => {
  if (e.target.closest('button')) sfx.click()
})

function refreshSound() {
  document.querySelectorAll('.sound').forEach((b) => (b.textContent = isSoundOn() ? '🔊' : '🔇'))
}
document.querySelectorAll('.sound').forEach((b) =>
  b.addEventListener('click', () => {
    setSound(!isSoundOn())
    refreshSound()
  })
)
refreshSound()

// ---------- 처음 화면 ----------
const nameInput = $('#name')
nameInput.value = profile.name
nameInput.addEventListener('input', () => {
  profile.name = nameInput.value.trim().slice(0, 8)
  saveProfile()
})

function buildChars() {
  const box = $('#chars')
  box.innerHTML = ''
  for (const c of CHARS) {
    const el = document.createElement('div')
    el.className = 'char' + (c.id === profile.char ? ' on' : '')
    el.appendChild(charIcon(c.id, 54))
    const t = document.createElement('span')
    t.textContent = c.name
    el.appendChild(t)
    el.onclick = () => {
      profile.char = c.id
      saveProfile()
      buildChars()
    }
    box.appendChild(el)
  }
}

function themeThumb(theme) {
  const c = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = 200 * dpr
  c.height = 92 * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  g.scale(0.5, 0.5) // 크게 그려서 줄이면 꽃잎·별이 작고 예쁘게
  const sc = new Scene(theme)
  sc.drawSky(g, 400, 184, 1, 0.016)
  return c
}

function buildThemes() {
  const box = $('#themes')
  box.innerHTML = ''
  for (const [id, th] of Object.entries(THEMES)) {
    const el = document.createElement('button')
    el.className = 'theme' + (id === profile.theme ? ' on' : '')
    el.appendChild(themeThumb(id))
    el.insertAdjacentHTML('beforeend', `<div class="t">${th.name}</div><div class="d">${th.desc}</div>`)
    el.onclick = () => {
      profile.theme = id
      saveProfile()
      buildThemes()
    }
    box.appendChild(el)
  }
}
buildChars()
buildThemes()

function needName() {
  if (profile.name) return false
  toast('이름을 먼저 써 주세요 ✏️')
  nameInput.focus()
  return true
}

$('#solo').onclick = () => {
  if (needName()) return
  openSongs('solo')
}
$('#race').onclick = () => {
  if (needName()) return
  openLobby()
}
$('#rankBtn').onclick = () => openRank(profile.song, '#title')
$('#howBtn').onclick = () => show('#how')
$('#howBack').onclick = () => show('#title')

// ---------- 곡 고르기 ----------
let songsMode = 'solo' // solo | pick (경주 방장이 고르기)
function openSongs(m) {
  songsMode = m
  $('#songsTitle').textContent = m === 'pick' ? '경주할 곡 고르기' : '곡 고르기'
  show('#songs')
  renderSongs()
}

document.querySelectorAll('#levelTabs button').forEach((b) =>
  b.addEventListener('click', () => {
    profile.level = Number(b.dataset.level)
    saveProfile()
    renderSongs()
  })
)
$('#songsBack').onclick = () => (songsMode === 'pick' ? openLobby() : show('#title'))

function fmtLen(sec) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function renderSongs() {
  document.querySelectorAll('#levelTabs button').forEach((b) => b.classList.toggle('on', Number(b.dataset.level) === profile.level))
  const box = $('#songList')
  box.innerHTML = ''
  for (const s of SONGS.filter((x) => x.level === profile.level)) {
    const chart = makeChart(s)
    const best = myBestLocal(s.id, profile.name)
    const el = document.createElement('div')
    el.className = 'song'
    el.innerHTML = `<button class="pre" title="미리 듣기">▶</button>
      <div class="info"><b>${s.title}</b><small>${s.by} · ${fmtLen(chart.duration)} · 건반 ${chart.notes.length}개</small><span class="arr">${ARR_INFO[s.arr] || ''}</span>
      ${best ? `<span class="best">내 최고 ${best.toLocaleString()}점</span>` : ''}</div>
      <button class="play-btn pink">${songsMode === 'pick' ? '이 곡!' : '연주'}</button>`
    el.querySelector('.pre').onclick = (e) => {
      e.stopPropagation()
      unlockAudio()
      sfx.preview(s, chart)
    }
    el.querySelector('.play-btn').onclick = () => {
      profile.song = s.id
      saveProfile()
      if (songsMode === 'pick') {
        room?.update({ song: s.id })
        openLobby()
        renderPeers()
      } else startSolo(s.id)
    }
    box.appendChild(el)
  }
}

// ---------- 연주 ----------
let game = null
let mode = null
let current = null
let hudRaf = 0

function hudLoop() {
  if (!game) return
  const k = Math.max(0, Math.min(1, game.t / game.chart.duration))
  $('#hudBar').style.width = k * 100 + '%'
  hudRaf = requestAnimationFrame(hudLoop)
}

function launch({ songId, theme, rivals, delay = 1.6 }) {
  endGame()
  unlockAudio()
  const song = songById(songId)
  const chart = makeChart(song)
  current = { song, chart, theme }
  document.body.dataset.theme = theme
  screens.forEach((s) => $(s).classList.add('hidden'))
  $('#hud').classList.remove('hidden')
  $('#hudSong').textContent = `${LEVEL_INFO[song.level].name} · ${song.title}`
  $('#hudScore').textContent = '0'
  game = new PianoGame(cv, {
    song,
    chart,
    theme,
    fall: LEVEL_INFO[song.level].fall,
    me: { id: profile.id, name: profile.name, char: profile.char },
    rivals,
    race: mode === 'race',
    onEnd: (r) => finished(r),
    onSend: (t, d) => room?.send(t, d),
    onHud: (h) => ($('#hudScore').textContent = h.score.toLocaleString()),
  })
  game.begin(delay)
  hudLoop()
}

function cpuRivals() {
  const taken = new Set([profile.char])
  const pick = (want, alt) => (taken.has(want) ? alt : want)
  return [
    { id: 'cpu-bunny', name: '깡총이', char: pick('bunny', 'cat'), cpu: 0.82, seed: 11 },
    { id: 'cpu-puppy', name: '멍멍이', char: pick('puppy', 'bear'), cpu: 0.66, seed: 23 },
  ]
}

function startSolo(songId) {
  mode = 'solo'
  launch({ songId, theme: profile.theme, rivals: cpuRivals() })
}

function endGame() {
  cancelAnimationFrame(hudRaf)
  if (game) game.destroy()
  game = null
  $('#hud').classList.add('hidden')
  const g = cv.getContext('2d')
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, cv.width, cv.height)
}

$('#quit').onclick = () => {
  endGame()
  if (mode === 'race') backToRoom()
  else openSongs('solo')
}

async function finished(r) {
  const song = current.song
  const prevBest = myBestLocal(song.id, profile.name)
  await saveRun({
    song: song.id,
    name: profile.name,
    avatar: profile.char,
    score: r.score,
    max_combo: r.maxCombo,
    grade: r.grade,
    perfect: r.perfect,
    good: r.good,
    bad: r.bad,
    miss: r.miss,
    mode,
  })
  // 친구들이 끝날 때까지 조금 기다렸다가 결과
  setTimeout(() => showResult(r, prevBest), mode === 'race' ? 2500 : 1200)
}

function showResult(r, prevBest) {
  if (!game) return
  const order = game.places()
  const place = order.findIndex((x) => x.me) + 1
  $('#resPlace').textContent = place === 1 ? '🥇 1등으로 골인!' : `${place}등으로 골인!`
  $('#resGrade').textContent = r.grade
  $('#resSong').textContent = `${current.song.title} · ${LEVEL_INFO[current.song.level].name}`
  $('#resScore').textContent = `${r.score.toLocaleString()}점`
  $('#resCounts').innerHTML = [
    ['PERFECT', r.perfect],
    ['GOOD', r.good],
    ['BAD', r.bad],
    ['MISS', r.miss],
    ['최고 콤보', r.maxCombo],
  ]
    .map(([k, v]) => `<span><b>${v}</b>${k}</span>`)
    .join('')
  $('#resMsg').textContent = !prevBest ? '첫 기록이에요!' : r.score > prevBest ? `새 기록! 🎊 (전: ${prevBest.toLocaleString()}점)` : `내 최고 기록: ${prevBest.toLocaleString()}점`
  const ol = $('#resRace')
  ol.innerHTML = ''
  order.forEach((x, i) => {
    const li = document.createElement('li')
    if (x.me) li.className = 'me'
    li.innerHTML = `<span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span>`
    li.appendChild(charIcon(x.char, 40))
    li.insertAdjacentHTML('beforeend', `<span class="who">${esc(x.name)}</span><span class="v">${(x.score || 0).toLocaleString()}점</span>`)
    ol.appendChild(li)
  })
  $('#again').textContent = mode === 'race' ? '방으로 돌아가기' : '다시 하기'
  $('#toSongs').classList.toggle('hidden', mode === 'race')
  show('#result')
}

$('#again').onclick = () => {
  if (mode === 'race') {
    endGame()
    backToRoom()
  } else startSolo(current.song.id)
}
$('#toSongs').onclick = () => {
  endGame()
  openSongs('solo')
}
$('#resRank').onclick = () => {
  const id = current.song.id
  endGame()
  if (mode === 'race') leaveRoom()
  openRank(id, '#title')
}
$('#resHome').onclick = () => {
  endGame()
  if (mode === 'race') leaveRoom()
  show('#title')
}

// ---------- 친구랑 경주 ----------
let room = null
const chat = makeChat({
  log: $('#chatLog'),
  form: $('#chatForm'),
  input: $('#chatInput'),
  quick: $('#chatQuick'),
  icon: (m) => charIcon(m.char, 30),
  onNew: () => !$('#lobby').classList.contains('hidden') && sfx.click(),
})
const race = { peers: [], players: [] }

function openLobby() {
  show('#lobby')
  $('#lobbyJoin').classList.toggle('hidden', !!room)
  $('#lobbyRoom').classList.toggle('hidden', !room)
  $('#makeRoom').disabled = !canRace
  $('#joinRoom').disabled = !canRace
  $('#netNote').textContent = canRace
    ? localTest && !online
      ? '테스트 모드: 이 기기의 다른 탭끼리만 연결돼요'
      : '친구가 같은 방 번호로 들어오면 같이 달려요'
    : '친구랑 경주는 인터넷 설정(Supabase)을 하면 쓸 수 있어요. 지금은 혼자 연주만 돼요.'
}

$('#makeRoom').onclick = () => enterRoom(newCode())
$('#joinRoom').onclick = () => {
  const code = $('#code').value.replace(/\D/g, '')
  if (code.length !== 4) return toast('방 번호 4자리를 써 주세요')
  enterRoom(code)
}
$('#lobbyBack').onclick = () => {
  leaveRoom()
  show('#title')
}
$('#pickSong').onclick = () => openSongs('pick')

function enterRoom(code) {
  leaveRoom()
  race.peers = []
  room = joinRoom(code, { id: profile.id, name: profile.name, char: profile.char, song: profile.song, theme: profile.theme, playing: false }, {
    onPeers: (list) => {
      race.peers = list
      renderPeers()
      chat.peers(list, isHost())
      if (game && mode === 'race') {
        const ids = new Set(list.map((p) => p.id))
        for (const p of race.players) if (!ids.has(p.id)) game.removeRunner(p.id)
      }
    },
    onMsg: onRoomMsg,
    onStatus: (s) => {
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') toast('연결이 불안정해요 📶')
    },
  })
  chat.start(room, { id: profile.id, name: profile.name, char: profile.char })
  $('#roomCode').textContent = code
  openLobby()
}

function leaveRoom() {
  if (room) room.leave()
  room = null
  chat.stop()
}

function backToRoom() {
  if (!room) {
    show('#title')
    return
  }
  room.update({ playing: false })
  openLobby()
  renderPeers()
}

function isHost() {
  const h = hostOf(race.peers)
  return h && h.id === profile.id
}

function renderPeers() {
  const box = $('#peers')
  box.innerHTML = ''
  const host = hostOf(race.peers)
  for (const p of [...race.peers].sort((a, b) => a.joinedAt - b.joinedAt)) {
    const el = document.createElement('div')
    el.className = 'peer'
    el.appendChild(charIcon(p.char, 60))
    const n = document.createElement('div')
    n.textContent = p.name + (p.id === profile.id ? ' (나)' : '')
    el.appendChild(n)
    const s = document.createElement('div')
    s.className = 'host'
    s.textContent = (host && p.id === host.id ? '👑 방장 ' : '') + (p.playing ? '🎹 연주 중' : '')
    el.appendChild(s)
    box.appendChild(el)
  }
  const h = isHost()
  $('#startRace').classList.toggle('hidden', !h)
  $('#pickSong').classList.toggle('hidden', !h)
  $('#waitHost').classList.toggle('hidden', h)
  const src = h ? profile : host
  const song = songById(src?.song)
  $('#lobbySong').innerHTML = `🎵 ${song.title}<small>${LEVEL_INFO[song.level].name} · ${THEMES[src?.theme || 'spring'].name}</small>`
}

$('#startRace').onclick = () => {
  if (!room || !isHost()) return
  const players = race.peers.map(({ id, name, char }) => ({ id, name, char }))
  const msg = { song: profile.song, theme: profile.theme, players }
  room.send('start', msg)
  beginRace(msg)
}

function beginRace({ song, theme, players }) {
  mode = 'race'
  race.players = players
  room.update({ playing: true })
  const rivals = players.filter((p) => p.id !== profile.id)
  launch({ songId: song, theme, rivals, delay: 2.2 })
}

function onRoomMsg(from, type, d) {
  if (type === 'chat' || type === 'chatlog') return chat.receive(from, type, d)
  if (type === 'start') {
    if (d.players.some((p) => p.id === profile.id)) beginRace(d)
    return
  }
  if (game && mode === 'race') game.remote(from, type, d)
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// ---------- 랭킹 ----------
let rankBack = '#title'
let rankTab = 'song'
const sel = $('#rankSong')
for (const lv of [1, 2, 3]) {
  const og = document.createElement('optgroup')
  og.label = `${LEVEL_INFO[lv].name} (${LEVEL_INFO[lv].sub})`
  for (const s of SONGS.filter((x) => x.level === lv)) {
    const o = document.createElement('option')
    o.value = s.id
    o.textContent = s.title
    og.appendChild(o)
  }
  sel.appendChild(og)
}
sel.onchange = () => renderRank()

function openRank(songId, back) {
  rankBack = back
  sel.value = songId
  show('#rank')
  renderRank()
}

document.querySelectorAll('#rankTabs button').forEach((b) =>
  b.addEventListener('click', () => {
    rankTab = b.dataset.tab
    renderRank()
  })
)
$('#rankBack').onclick = () => show(rankBack)

async function renderRank() {
  document.querySelectorAll('#rankTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === rankTab))
  sel.classList.toggle('hidden', rankTab !== 'song')
  const ol = $('#rankList')
  ol.innerHTML = '<li><span class="who">불러오는 중…</span></li>'
  $('#rankNote').textContent = online ? '모두의 랭킹이에요' : '이 기기에서 한 기록이에요'
  const key = rankTab === 'song' ? sel.value : 'points'
  const rows = key === 'points' ? await topPoints() : await topScores(key)
  if (key !== (rankTab === 'song' ? sel.value : 'points')) return
  ol.innerHTML = ''
  if (!rows.length) ol.innerHTML = '<li><span class="who">아직 기록이 없어요. 첫 번째가 되어 보세요!</span></li>'
  rows.forEach((r, i) => {
    const li = document.createElement('li')
    if (r.name === profile.name) li.className = 'me'
    li.innerHTML = `<span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span>`
    li.appendChild(charIcon(r.avatar || 'bunny', 40))
    const v = key === 'points' ? `${r.total.toLocaleString()}점 <small>(${r.plays}곡)</small>` : `${r.score.toLocaleString()}점 <small>${r.grade || ''}</small>`
    li.insertAdjacentHTML('beforeend', `<span class="who">${esc(r.name)}</span><span class="v">${v}</span>`)
    ol.appendChild(li)
  })
}

show('#title')

// 개발 중 자동 테스트용
if (import.meta.env.DEV) import('./music.js').then((m) => (window.__piano = { get game() { return game }, capture: m.captureStream }))
