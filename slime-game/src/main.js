import './style.css'
import { CHARS, HATS, charIcon } from './chars.js'
import { MAPS, LEVELS, loadMap } from './map.js'
import { Game, ITEMS } from './game.js'
import { unlockAudio, startMusic, setSound, isSoundOn, sfx } from './audio.js'
import { canRace, online, localTest, joinRoom, newCode, hostOf } from './net.js'
import { local, session } from './store.js'
import { saveRun, topTimes, topPoints, myBest, calcPoints, starsFor, rankKey } from './rank.js'

const $ = (s) => document.querySelector(s)
const cv = $('#cv')

// ---------- 내 정보 ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
let saved = {}
try {
  saved = JSON.parse(local.get('slime.profile') || '{}') || {}
} catch {
  saved = {}
}
const profile = {
  id: session.get('slime.id') || uid(), // 탭마다 다른 id (같은 폰 두 탭 테스트 가능)
  name: saved.name || '',
  char: saved.char || CHARS[0].id,
  map: MAPS.some((m) => m.id === saved.map) ? saved.map : MAPS[0].id,
  level: LEVELS.some((l) => l.n === saved.level) ? saved.level : 1,
  hat: HATS.some((h) => h.id === saved.hat) ? saved.hat : null,
  zoom: saved.zoom !== false,
}
// 꾸미기 가게: 게임에서 모은 별 (이 기기에 저장)
let bank = { stars: 0, owned: [] }
try {
  bank = { ...bank, ...(JSON.parse(local.get('slime.bank') || '{}') || {}) }
} catch {
  // 처음
}
const saveBank = () => local.set('slime.bank', JSON.stringify(bank))
session.set('slime.id', profile.id)
const saveProfile = () =>
  local.set('slime.profile', JSON.stringify({ name: profile.name, char: profile.char, map: profile.map, level: profile.level, hat: profile.hat, zoom: profile.zoom }))
const levelOf = (n) => LEVELS.find((l) => l.n === n) || LEVELS[0]

// ---------- 화면 전환 ----------
const screens = ['#title', '#lobby', '#rank', '#how', '#result', '#shop']
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

// 첫 터치에 소리 켜기 (휴대폰 브라우저 규칙. 아이폰은 touchend/click 에서만 켜지기도 함)
const wake = () => {
  unlockAudio()
  startMusic()
}
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
    el.appendChild(charIcon(c.id, 64, c.id === profile.char ? profile.hat : null))
    const t = document.createElement('span')
    t.textContent = c.name
    el.appendChild(t)
    el.onclick = () => {
      profile.char = c.id
      saveProfile()
      sfx.flap()
      buildChars()
    }
    box.appendChild(el)
  }
}

function buildMaps() {
  const box = $('#maps')
  box.innerHTML = ''
  for (const m of MAPS) {
    const el = document.createElement('div')
    el.className = 'map' + (m.id === profile.map ? ' on' : '')
    el.innerHTML = `<img src="maps/${m.id}/thumb.jpg" alt=""><div class="t">${m.name}</div><div class="d">${m.desc}</div>`
    el.onclick = () => {
      profile.map = m.id
      saveProfile()
      buildMaps()
    }
    box.appendChild(el)
  }
  const lv = $('#levels')
  lv.innerHTML = ''
  for (const l of LEVELS) {
    const b = document.createElement('button')
    b.className = 'level' + (l.n === profile.level ? ' on' : '')
    b.innerHTML = `${l.name}<small>괴물 ${l.monsters}마리</small><small>${l.crumble ? '💥 부서지는 구름' : '☁️ 쉬움'}</small>`
    b.onclick = () => {
      profile.level = l.n
      saveProfile()
      buildMaps()
    }
    lv.appendChild(b)
  }
}
buildChars()
buildMaps()

function needName() {
  if (profile.name) return false
  toast('이름을 먼저 써 주세요 ✏️')
  nameInput.focus()
  return true
}

$('#solo').onclick = () => {
  if (needName()) return
  startSolo()
}
$('#race').onclick = () => {
  if (needName()) return
  openLobby()
}
$('#rankBtn').onclick = () => openRank(profile.map, profile.level, '#title')
$('#howBtn').onclick = () => show('#how')
$('#shopBtn').onclick = () => openShop()
$('#shopBack').onclick = () => {
  buildChars()
  show('#title')
}

// ---------- 꾸미기 가게 ----------
function openShop() {
  show('#shop')
  renderShop()
}

function renderShop() {
  $('#bankStars').textContent = bank.stars
  const pv = $('#shopPreview')
  pv.innerHTML = ''
  pv.appendChild(charIcon(profile.char, 130, profile.hat))
  const box = $('#shopItems')
  box.innerHTML = ''
  const items = [{ id: null, name: '안 쓰기', price: 0 }, ...HATS]
  for (const h of items) {
    const owned = !h.id || bank.owned.includes(h.id)
    const el = document.createElement('button')
    el.className = 'shop-item' + (profile.hat === h.id ? ' on' : '') + (owned ? ' owned' : '')
    el.appendChild(charIcon(profile.char, 62, h.id))
    el.insertAdjacentHTML('beforeend', `<b>${h.name}</b><small>${profile.hat === h.id ? '쓰는 중' : owned ? '쓰기' : `⭐ ${h.price}`}</small>`)
    el.onclick = () => {
      if (!owned) {
        if (bank.stars < h.price) {
          toast(`별이 ${h.price - bank.stars}개 더 필요해요 ⭐`)
          return
        }
        bank.stars -= h.price
        bank.owned.push(h.id)
        saveBank()
        sfx.item()
        toast(`${h.name}을(를) 샀어요! 🎉`)
      } else sfx.flap()
      profile.hat = h.id
      saveProfile()
      renderShop()
    }
    box.appendChild(el)
  }
}
$('#howBack').onclick = () => show('#title')

// ---------- 게임 ----------
let game = null
let mode = null
let hudRaf = 0
let current = null // { mapId, level }

function hudLoop() {
  if (!game) return
  const t = game.t
  if (!game.me.done) $('#timer').textContent = t < 0 ? '준비…' : t.toFixed(1) + '초'
  hudRaf = requestAnimationFrame(hudLoop)
}

function renderHud(h) {
  $('#starCount').textContent = h.stars
  const btn = $('#itemBtn')
  btn.classList.toggle('rolling', h.rolling)
  btn.classList.toggle('ready', !!h.item)
  btn.textContent = h.rolling ? '❓' : h.item ? ITEMS[h.item].emoji : ''
  btn.disabled = !h.item
  $('#effects').textContent = h.fx.map((k) => ITEMS[k].emoji).join(' ')
}

$('#itemBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault()
  game?.useItem()
})

$('#zoomBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault()
  profile.zoom = !profile.zoom
  saveProfile()
  game?.setZoom(profile.zoom)
  $('#zoomBtn').textContent = profile.zoom ? '🗺️' : '🔍'
})
document.querySelectorAll('#emotes button').forEach((b) =>
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    game?.emote(profile.id, b.textContent)
  })
)

async function launch({ mapId, level, seed, others = [], delay = 3.6 }) {
  const map = await loadMap(mapId)
  endGame()
  current = { mapId, level }
  screens.forEach((s) => $(s).classList.add('hidden'))
  $('#hud').classList.remove('hidden')
  game = new Game(cv, {
    map,
    level: levelOf(level),
    race: mode === 'race',
    zoom: profile.zoom,
    me: { id: profile.id, name: profile.name, char: profile.char, hat: profile.hat, slot: Math.max(0, race.players.findIndex((p) => p.id === profile.id)) },
    seed,
    others,
    onWin: (t, stats) => finished(t, stats),
    onSend: (type, d) => room?.send(type, d),
    onToast: (s) => toast(s),
    onHud: renderHud,
  })
  game.begin(performance.now() / 1000 + delay)
  game.hud()
  $('#zoomBtn').textContent = profile.zoom ? '🗺️' : '🔍'
  $('#emotes').classList.toggle('hidden', mode !== 'race')
  hudLoop()
  setTimeout(() => game && game.t < 2 && toast('톡 누르면 파닥! 여러 번 누르면 더 멀리 날아요 🪽', 2800), (delay - 0.5) * 1000)
}

function endGame() {
  cancelAnimationFrame(hudRaf)
  if (game) game.destroy()
  game = null
  $('#hud').classList.add('hidden')
  $('#toast').classList.add('hidden')
  const g = cv.getContext('2d')
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, cv.width, cv.height)
}

function startSolo() {
  mode = 'solo'
  race.players = []
  $('#standings').innerHTML = ''
  launch({ mapId: profile.map, level: profile.level, seed: (Math.random() * 1e9) | 0 }).catch((e) => toast(e.message))
}

$('#quit').onclick = () => {
  endGame()
  if (mode === 'race') backToRoom()
  else show('#title')
}

async function finished(t, stats) {
  const key = rankKey(current.mapId, current.level)
  $('#timer').textContent = t.toFixed(2) + '초'
  let place = 0
  if (mode === 'race') {
    race.finishes.set(profile.id, t)
    place = 1 + [...race.finishes.entries()].filter(([id, tt]) => id !== profile.id && tt < t).length
    renderStandings()
  }
  const points = calcPoints(t, place, stats, current.level)
  // 꾸미기 가게용 별: 모은 별 + 도착 보너스
  stats.earned = stats.stars + 2 + current.level + (place === 1 ? 3 : 0)
  bank.stars += stats.earned
  saveBank()
  const prevBest = await myBest(key, profile.name)
  await saveRun({ map: key, name: profile.name, avatar: profile.char, time_ms: Math.round(t * 1000), points, mode })
  setTimeout(() => showResult(t, points, place, prevBest, stats), 1300)
}

function showResult(t, points, place, prevBest, stats) {
  if (!game) return
  const stars = starsFor(t)
  $('#resTitle').textContent = place === 1 ? '1등! 🥇' : place ? `${place}등! 🎉` : '성공! 🎉'
  const rc = $('#resChar')
  rc.innerHTML = ''
  rc.appendChild(charIcon(profile.char, 96, profile.hat))
  $('#resStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">⭐</span>`).join('')
  $('#resTime').textContent = t.toFixed(2) + '초'
  $('#resPoints').textContent = `+${points}점`
  $('#resStats').innerHTML = `<span>⭐ 별 ${stats.stars}개</span><span>✨ PERFECT ${stats.perfect}</span><span>🔥 최고 콤보 ${stats.bestCombo}</span><span class="bank">🎁 꾸미기 별 +${stats.earned} (모두 ${bank.stars})</span>`
  const ms = Math.round(t * 1000)
  $('#resMsg').textContent = !prevBest ? '첫 기록이에요!' : ms < prevBest ? `새 기록! 🎊 (전: ${(prevBest / 1000).toFixed(2)}초)` : `내 최고 기록: ${(prevBest / 1000).toFixed(2)}초`
  $('#resRace').classList.toggle('hidden', mode !== 'race')
  $('#again').textContent = mode === 'race' ? '방으로 돌아가기' : '다시 하기'
  $('#nextLevel').classList.toggle('hidden', mode === 'race' || current.level >= LEVELS.length)
  if (mode === 'race') renderResultRace()
  show('#result')
}

$('#again').onclick = () => {
  if (mode === 'race') {
    endGame()
    backToRoom()
  } else startSolo()
}
$('#nextLevel').onclick = () => {
  profile.level = Math.min(LEVELS.length, current.level + 1)
  saveProfile()
  buildMaps()
  startSolo()
}
$('#resRank').onclick = () => {
  const c = current
  endGame()
  if (mode === 'race') leaveRoom()
  openRank(c.mapId, c.level, '#title')
}
$('#resHome').onclick = () => {
  endGame()
  if (mode === 'race') leaveRoom()
  show('#title')
}

// ---------- 친구랑 경주 ----------
let room = null
const race = { code: '', peers: [], players: [], finishes: new Map(), running: false }

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
    : '친구랑 경주는 인터넷 설정(Supabase)을 하면 쓸 수 있어요. 지금은 혼자 하기만 돼요.'
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

function enterRoom(code) {
  leaveRoom()
  race.code = code
  race.peers = []
  room = joinRoom(code, { id: profile.id, name: profile.name, char: profile.char, hat: profile.hat, map: profile.map, level: profile.level, racing: false }, {
    onPeers: (list) => {
      race.peers = list
      renderPeers()
      if (game && mode === 'race') {
        const ids = new Set(list.map((p) => p.id))
        for (const p of race.players) if (!ids.has(p.id)) game.removeOther(p.id)
      }
    },
    onMsg: onRoomMsg,
    onStatus: (s) => {
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') toast('연결이 불안정해요 📶')
    },
  })
  $('#roomCode').textContent = code
  openLobby()
}

function leaveRoom() {
  if (room) room.leave()
  room = null
  race.running = false
}

function backToRoom() {
  if (!room) {
    show('#title')
    return
  }
  room.update({ racing: false, map: profile.map, level: profile.level })
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
    el.appendChild(charIcon(p.char, 60, p.hat))
    const n = document.createElement('div')
    n.textContent = p.name + (p.id === profile.id ? ' (나)' : '')
    el.appendChild(n)
    const s = document.createElement('div')
    s.className = 'host'
    s.textContent = (host && p.id === host.id ? '👑 방장 ' : '') + (p.racing ? '🏃 경주 중' : '')
    el.appendChild(s)
    box.appendChild(el)
  }
  const h = isHost()
  $('#startRace').classList.toggle('hidden', !h)
  $('#waitHost').classList.toggle('hidden', h)
  const src = h ? profile : host
  const mapName = MAPS.find((m) => m.id === src?.map)?.name || ''
  $('#lobbyMap').textContent = mapName ? `맵: ${mapName} ${levelOf(src.level).name}` + (h ? ' (처음 화면에서 바꿀 수 있어요)' : '') : ''
}

$('#startRace').onclick = () => {
  if (!room || !isHost()) return
  const players = race.peers.map(({ id, name, char, hat }) => ({ id, name, char, hat }))
  const msg = { map: profile.map, level: profile.level, seed: (Math.random() * 1e9) | 0, players }
  room.send('start', msg)
  beginRace(msg)
}

function beginRace({ map, level, seed, players }) {
  mode = 'race'
  race.players = players
  race.finishes = new Map()
  race.running = true
  room.update({ racing: true })
  const others = players.map((p, slot) => ({ ...p, slot })).filter((p) => p.id !== profile.id)
  launch({ mapId: map, level: level || 1, seed, others }).then(renderStandings).catch((e) => toast(e.message))
}

function onRoomMsg(from, type, d) {
  if (type === 'start') {
    if (d.players.some((p) => p.id === profile.id)) beginRace(d)
    return
  }
  if (!game || mode !== 'race') return
  if (type === 'w') {
    race.finishes.set(from, d.time)
    renderStandings()
    if (!$('#result').classList.contains('hidden')) renderResultRace()
  }
  game.remote(from, type, d)
}

function standingRows() {
  const fin = [...race.finishes.entries()].sort((a, b) => a[1] - b[1])
  const byId = new Map(race.players.map((p) => [p.id, p]))
  const rows = fin.map(([id, t], i) => ({ p: byId.get(id), t, place: i + 1 }))
  for (const p of race.players) if (!race.finishes.has(p.id)) rows.push({ p, t: null })
  return rows.filter((r) => r.p)
}

function renderStandings() {
  if (mode !== 'race') return
  $('#standings').innerHTML = standingRows()
    .map((r) => `<span>${r.t != null ? ['🥇', '🥈', '🥉'][r.place - 1] || r.place + '등' : '🏃'} ${esc(r.p.name)}</span>`)
    .join('')
}

function renderResultRace() {
  const ol = $('#resRace')
  ol.innerHTML = ''
  for (const r of standingRows()) {
    const li = document.createElement('li')
    if (r.p.id === profile.id) li.className = 'me'
    li.innerHTML = `<span class="n">${r.t != null ? ['🥇', '🥈', '🥉'][r.place - 1] || r.place : '…'}</span>`
    li.appendChild(charIcon(r.p.char, 40, r.p.hat))
    li.insertAdjacentHTML('beforeend', `<span class="who">${esc(r.p.name)}</span><span class="v">${r.t != null ? r.t.toFixed(2) + '초' : '날아가는 중'}</span>`)
    ol.appendChild(li)
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// ---------- 랭킹 ----------
let rankBack = '#title'
let rankTab = 'saebom'
let rankLevel = 1

function openRank(tab, level, back) {
  rankBack = back
  rankTab = tab
  rankLevel = level || 1
  show('#rank')
  renderRank()
}

document.querySelectorAll('#rankTabs button').forEach((b) =>
  b.addEventListener('click', () => {
    rankTab = b.dataset.tab
    renderRank()
  })
)
document.querySelectorAll('#rankLevels button').forEach((b) =>
  b.addEventListener('click', () => {
    rankLevel = Number(b.dataset.level)
    renderRank()
  })
)
$('#rankBack').onclick = () => show(rankBack)

async function renderRank() {
  document.querySelectorAll('#rankTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === rankTab))
  document.querySelectorAll('#rankLevels button').forEach((b) => b.classList.toggle('on', Number(b.dataset.level) === rankLevel))
  $('#rankLevels').classList.toggle('hidden', rankTab === 'points')
  const ol = $('#rankList')
  ol.innerHTML = '<li><span class="who">불러오는 중…</span></li>'
  $('#rankNote').textContent = online ? '모두의 랭킹이에요' : '이 기기에서 한 기록이에요'
  const key = rankTab === 'points' ? 'points' : rankKey(rankTab, rankLevel)
  const rows = key === 'points' ? await topPoints() : await topTimes(key)
  if (key !== (rankTab === 'points' ? 'points' : rankKey(rankTab, rankLevel))) return
  ol.innerHTML = ''
  if (!rows.length) ol.innerHTML = '<li><span class="who">아직 기록이 없어요. 첫 번째가 되어 보세요!</span></li>'
  rows.forEach((r, i) => {
    const li = document.createElement('li')
    if (r.name === profile.name) li.className = 'me'
    li.innerHTML = `<span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span>`
    li.appendChild(charIcon(r.avatar || 'bunny', 40))
    const v = key === 'points' ? `${r.total}점 <small>(${r.plays}판)</small>` : (r.time_ms / 1000).toFixed(2) + '초'
    li.insertAdjacentHTML('beforeend', `<span class="who">${esc(r.name)}</span><span class="v">${v}</span>`)
    ol.appendChild(li)
  })
}

show('#title')

// 개발 중 자동 테스트용
if (import.meta.env.DEV) window.__slime = { get game() { return game } }
