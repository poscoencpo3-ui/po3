// 대기실 채팅: 같은 방 친구들과 말풍선으로 이야기해요
// 방 채널로 바로 주고받고 어디에도 저장하지 않아요 (방을 나가면 사라짐)
const QUICK = ['👋 안녕!', '준비됐어!', '빨리 하자!', '잠깐만!', '한 판 더!', '😆', '👍', '❤️', '🎉']
const MAX = 40 // 한 번에 보낼 수 있는 글자 수
const KEEP = 60 // 화면에 남겨 둘 말 수
const HISTORY = 30 // 새로 들어온 친구에게 보내 줄 지난 이야기 수

export function clean(text) {
  return [...String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, MAX).join('')
}

const onlyEmoji = (s) => /^(\p{Extended_Pictographic}|️|‍|\s)+$/u.test(s)

export function makeChat({ log, form, input, quick, icon, onNew }) {
  let room = null
  let me = null
  let msgs = []
  let seen = new Set()
  let known = null
  let quietUntil = 0
  let lastSent = 0

  function add(m) {
    if (m.id) {
      if (seen.has(m.id)) return false
      seen.add(m.id)
    }
    msgs.push(m)
    if (msgs.length > KEEP) msgs = msgs.slice(-KEEP)
    return true
  }

  // 받은 말은 믿지 않고 모양을 다시 맞춤
  function fromWire(from, d) {
    const text = clean(d?.text)
    if (!text) return null
    return {
      id: String(d.id || '').slice(0, 64) || null,
      from: String(from || '').slice(0, 40),
      name: clean(d.name).slice(0, 8) || '친구',
      char: String(d.char || '').slice(0, 16),
      hat: d.hat ? String(d.hat).slice(0, 16) : null,
      text,
      at: Number(d.at) || 0,
    }
  }

  function render() {
    log.innerHTML = ''
    if (!msgs.length) {
      const e = document.createElement('div')
      e.className = 'chat-empty'
      e.textContent = '아래 버튼을 눌러 친구에게 인사해 보세요!'
      log.appendChild(e)
    }
    for (const m of msgs) {
      const row = document.createElement('div')
      if (m.sys) {
        row.className = 'chat-sys'
        row.textContent = m.text
      } else {
        const mine = me && m.from === me.id
        row.className = 'chat-row' + (mine ? ' mine' : '')
        if (!mine) row.appendChild(icon(m))
        const col = document.createElement('div')
        col.className = 'chat-col'
        if (!mine) {
          const n = document.createElement('div')
          n.className = 'chat-name'
          n.textContent = m.name
          col.appendChild(n)
        }
        const b = document.createElement('div')
        b.className = 'chat-bubble' + (onlyEmoji(m.text) ? ' emoji' : '')
        b.textContent = m.text
        col.appendChild(b)
        row.appendChild(col)
      }
      log.appendChild(row)
    }
    log.scrollTop = log.scrollHeight
  }

  function post(text) {
    text = clean(text)
    if (!text || !room || !me) return false
    const now = Date.now()
    if (now - lastSent < 600) return false // 연타 방지
    lastSent = now
    const m = { id: String(me.id).slice(0, 12) + now.toString(36) + Math.random().toString(36).slice(2, 6), from: me.id, name: me.name, char: me.char, hat: me.hat || null, text, at: now }
    add(m)
    room.send('chat', m)
    render()
    return true
  }

  for (const q of QUICK) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = q
    b.onclick = () => post(q)
    quick.appendChild(b)
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (post(input.value)) input.value = ''
  })
  input.maxLength = MAX

  return {
    // 방에 들어갈 때
    start(r, profile) {
      room = r
      me = profile
      msgs = []
      seen = new Set()
      known = null
      quietUntil = Date.now() + 1500 // 막 들어왔을 때 이미 있던 친구는 '들어왔어요' 안 띄움
      input.value = ''
      render()
    },
    stop() {
      room = null
    },
    receive(from, type, d) {
      if (type === 'chat') {
        const m = fromWire(from, d)
        if (m && add(m)) {
          render()
          onNew?.()
        }
      } else if (type === 'chatlog' && Array.isArray(d?.list)) {
        // 들어오기 전 이야기: 지금 있는 말들 앞에 시간 순서로
        const old = d.list.slice(-HISTORY).map((x) => fromWire(x?.from, x)).filter((m) => m && !(m.id && seen.has(m.id)))
        if (!old.length) return
        old.sort((a, b) => a.at - b.at)
        old.forEach((m) => m.id && seen.add(m.id))
        msgs = [...old, ...msgs].slice(-KEEP)
        render()
      }
    },
    // 친구 목록이 바뀔 때 (들어옴·나감 알림, 방장은 새 친구에게 지난 이야기 보내기)
    peers(list, isHost) {
      if (!room || !me) return
      const now = Date.now()
      const ids = new Map(list.map((p) => [p.id, p]))
      if (known) {
        const joined = list.filter((p) => !known.has(p.id) && p.id !== me.id)
        const left = [...known.values()].filter((p) => !ids.has(p.id) && p.id !== me.id)
        if (now > quietUntil) {
          for (const p of joined) add({ sys: true, text: `${clean(p.name) || '친구'} 들어왔어요 👋`, at: now })
          for (const p of left) add({ sys: true, text: `${clean(p.name) || '친구'} 나갔어요`, at: now })
        }
        if (joined.length && isHost) {
          const list = msgs.filter((m) => !m.sys).slice(-HISTORY)
          if (list.length) room.send('chatlog', { list })
        }
        if (joined.length || left.length) render()
      }
      known = ids
    },
  }
}
