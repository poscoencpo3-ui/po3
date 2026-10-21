import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase, BUCKET, APP_NAME } from '../lib/supabase'
import { onRealtime } from '../lib/realtime'
import { navigate } from '../lib/router'
import { compressImage, extensionFor, imageFilesFrom } from '../lib/image'
import { primeImageUrl } from '../lib/imageUrls'
import { dayKey, formatCode, formatDay, minuteKey } from '../lib/format'
import { copyText, toast } from '../lib/toast'
import MessageItem from './MessageItem'
import Composer from './Composer'
import ImageViewer from './ImageViewer'
import SendImagesModal from './SendImagesModal'
import MembersPanel from './MembersPanel'
import NoticeBar from './NoticeBar'

const PAGE_SIZE = 50

function mergeMessages(prev, rows) {
  if (!rows.length) return prev
  const byId = new Map(prev.map((m) => [m.id, m]))
  rows.forEach((r) => byId.set(r.id, r))
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

export default function ChatRoom({ roomId, me, isAdmin, onRoomsChanged }) {
  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState([]) // 전송 중인 사진
  const [pickedFiles, setPickedFiles] = useState(null) // 전송 확인 대기 중인 사진
  const [viewer, setViewer] = useState(null)
  const [menu, setMenu] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [newBelow, setNewBelow] = useState(false)

  const listRef = useRef(null)
  const atBottomRef = useRef(true)
  const scrollRestoreRef = useRef(null)
  const initialScrollRef = useRef(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // ---------------- 불러오기 ----------------

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('room_members').select('*').eq('room_id', roomId)
    if (data) setMembers(data)
  }, [roomId])

  const loadInitial = useCallback(async () => {
    const [roomRes, memberRes, msgRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('room_members').select('*').eq('room_id', roomId),
      supabase.from('messages').select('*').eq('room_id', roomId).order('id', { ascending: false }).limit(PAGE_SIZE),
    ])
    if (!roomRes.data) {
      setNotFound(true)
      return
    }
    setRoom(roomRes.data)
    setMembers(memberRes.data || [])
    const rows = (msgRes.data || []).reverse()
    setMessages(rows)
    setHasMore(rows.length === PAGE_SIZE)
  }, [roomId])

  // 연결이 다시 됐을 때 놓친 메시지만 이어 받기
  const resync = useCallback(async () => {
    const list = messagesRef.current
    if (!list.length) return loadInitial()
    const lastId = list[list.length - 1].id
    const [msgRes, roomRes] = await Promise.all([
      supabase.from('messages').select('*').eq('room_id', roomId).gt('id', lastId).order('id').limit(500),
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    ])
    if (msgRes.data && msgRes.data.length) {
      if (!atBottomRef.current) setNewBelow(true)
      setMessages((prev) => mergeMessages(prev, msgRes.data))
    }
    if (roomRes.data) setRoom(roomRes.data)
    loadMembers()
  }, [roomId, loadInitial, loadMembers])

  async function loadOlder() {
    if (loadingOlder || !hasMore || !messages.length) return
    setLoadingOlder(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .lt('id', messages[0].id)
      .order('id', { ascending: false })
      .limit(PAGE_SIZE)
    if (data) {
      const el = listRef.current
      scrollRestoreRef.current = { height: el.scrollHeight, top: el.scrollTop }
      setMessages((prev) => mergeMessages(prev, data))
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingOlder(false)
  }

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // ---------------- 실시간 ----------------

  useEffect(
    () =>
      onRealtime((evt) => {
        const row = evt.row
        if (evt.type === 'message' && row.room_id === roomId) {
          if (!atBottomRef.current && row.user_id !== me) setNewBelow(true)
          setMessages((prev) => mergeMessages(prev, [row]))
        } else if (evt.type === 'message-update' && row.room_id === roomId) {
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)))
          setNotice((n) => (n && n.id === row.id ? row : n))
        } else if (evt.type === 'member' && row.room_id === roomId) {
          if (evt.event === 'DELETE') {
            setMembers((prev) => prev.filter((m) => m.user_id !== row.user_id))
          } else {
            setMembers((prev) => [...prev.filter((m) => m.user_id !== row.user_id), row])
          }
        } else if (evt.type === 'room' && row.id === roomId) {
          setRoom(row)
        } else if (evt.type === 'resync') {
          resync()
        }
      }),
    [roomId, me, resync]
  )

  // ---------------- 공지 ----------------

  const noticeId = room?.notice_message_id
  useEffect(() => {
    if (!noticeId) {
      setNotice(null)
      return
    }
    const local = messagesRef.current.find((m) => m.id === noticeId)
    if (local) {
      setNotice(local)
      return
    }
    supabase
      .from('messages')
      .select('*')
      .eq('id', noticeId)
      .maybeSingle()
      .then(({ data }) => setNotice(data))
  }, [noticeId])

  async function setNoticeMessage(messageId) {
    const { error } = await supabase.rpc('set_notice', { p_room: roomId, p_message_id: messageId })
    if (error) toast('공지 변경에 실패했습니다.')
  }

  // ---------------- 읽음 처리 ----------------

  const lastMarkedRef = useRef(0)
  const markRead = useCallback(() => {
    const list = messagesRef.current
    if (!list.length || document.hidden || !document.hasFocus()) return
    const lastId = list[list.length - 1].id
    if (lastId <= lastMarkedRef.current) return
    lastMarkedRef.current = lastId
    setMembers((prev) => prev.map((m) => (m.user_id === me && m.last_read_id < lastId ? { ...m, last_read_id: lastId } : m)))
    supabase.rpc('mark_read', { p_room: roomId, p_message_id: lastId }).then(({ error }) => {
      if (!error) onRoomsChanged()
    })
  }, [roomId, me, onRoomsChanged])

  useEffect(() => {
    markRead()
  }, [messages, markRead])

  useEffect(() => {
    window.addEventListener('focus', markRead)
    document.addEventListener('visibilitychange', markRead)
    return () => {
      window.removeEventListener('focus', markRead)
      document.removeEventListener('visibilitychange', markRead)
    }
  }, [markRead])

  // 메시지별 안 읽은 사람 수: 보낸 사람 제외, 메시지 이후에 들어온 사람 제외
  const unreadCount = useMemo(() => {
    const parsed = members.map((m) => ({ ...m, joined: new Date(m.joined_at).getTime() }))
    return (msg) => {
      const at = new Date(msg.created_at).getTime()
      return parsed.filter((m) => m.user_id !== msg.user_id && m.joined <= at && m.last_read_id < msg.id).length
    }
  }, [members])

  // ---------------- 스크롤 ----------------

  function scrollToBottom() {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
    atBottomRef.current = true
    setNewBelow(false)
  }

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (scrollRestoreRef.current) {
      const { height, top } = scrollRestoreRef.current
      el.scrollTop = top + (el.scrollHeight - height)
      scrollRestoreRef.current = null
    } else if (!initialScrollRef.current && messages.length) {
      initialScrollRef.current = true
      scrollToBottom()
    } else if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, pending])

  function onScroll() {
    const el = listRef.current
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (atBottomRef.current) setNewBelow(false)
    if (el.scrollTop < 60) loadOlder()
  }

  // 사진이 늦게 로드되며 높이가 바뀌어도 맨 아래를 유지
  function onMediaLoad() {
    if (atBottomRef.current) {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }

  // ---------------- 보내기 ----------------

  async function sendText(text) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, user_id: me, kind: 'text', body: text })
      .select()
      .single()
    if (error) {
      toast('메시지 전송에 실패했습니다.')
      return false
    }
    atBottomRef.current = true
    setMessages((prev) => mergeMessages(prev, [data]))
    return true
  }

  async function uploadOne(item) {
    setPending((prev) => prev.map((p) => (p.tempId === item.tempId ? { ...p, status: 'sending' } : p)))
    try {
      const img = await compressImage(item.file)
      const path = `${roomId}/${crypto.randomUUID()}.${extensionFor(img.type)}`
      const up = await supabase.storage.from(BUCKET).upload(path, img.blob, { contentType: img.type, cacheControl: '31536000' })
      if (up.error) throw up.error
      primeImageUrl(path, item.previewUrl)
      const { data, error } = await supabase
        .from('messages')
        .insert({ room_id: roomId, user_id: me, kind: 'image', image_path: path, image_width: img.width, image_height: img.height })
        .select()
        .single()
      if (error) throw error
      atBottomRef.current = true
      setMessages((prev) => mergeMessages(prev, [data]))
      setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))
    } catch (err) {
      console.error(err)
      setPending((prev) => prev.map((p) => (p.tempId === item.tempId ? { ...p, status: 'failed' } : p)))
    }
  }

  async function sendImages(files) {
    setPickedFiles(null)
    const items = files.map((file) => ({
      tempId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'sending',
    }))
    atBottomRef.current = true
    setPending((prev) => [...prev, ...items])
    for (const item of items) await uploadOne(item)
  }

  function cancelPending(item) {
    URL.revokeObjectURL(item.previewUrl)
    setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))
  }

  function pickFiles(list) {
    const files = imageFilesFrom(list)
    if (files.length) setPickedFiles(files)
    else if (list && list.length) toast('사진(이미지) 파일만 보낼 수 있습니다.')
  }

  // 화면 어디서든 Ctrl+V 로 캡쳐 붙여넣기
  useEffect(() => {
    function onPaste(e) {
      const data = e.clipboardData
      // 엑셀 셀처럼 글자와 그림이 함께 복사된 경우는 글자로 붙여넣기
      if (!data || data.types.includes('text/plain')) return
      const files = imageFilesFrom(Array.from(data.items).map((i) => i.kind === 'file' && i.getAsFile()).filter(Boolean))
      if (!files.length) return
      e.preventDefault()
      setPickedFiles((prev) => [...(prev || []), ...files])
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  function onDragOver(e) {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault()
      setDragging(true)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    pickFiles(e.dataTransfer.files)
  }

  // ---------------- 방 메뉴 ----------------

  function inviteText() {
    const link = `${location.origin}${location.pathname}#/join/${room.code}`
    return `[${APP_NAME}] ${room.name}\n입장코드: ${formatCode(room.code)}\n접속주소: ${link}`
  }

  async function leave() {
    if (!window.confirm(`'${room.name}' 방에서 나가시겠습니까?\n다시 들어오려면 입장코드가 필요합니다.`)) return
    const { error } = await supabase.rpc('leave_room', { p_room: roomId })
    if (error) return toast('나가기에 실패했습니다.')
    onRoomsChanged()
    navigate('')
  }

  // ---------------- 화면 ----------------

  if (notFound) {
    return (
      <div className="chat-empty muted">
        <p>이 채팅방에 접근할 수 없습니다.</p>
        <a href="#/">채팅 목록으로</a>
      </div>
    )
  }
  if (!room) return <div className="chat-empty muted">불러오는 중…</div>

  const membersById = new Map(members.map((m) => [m.user_id, m]))

  return (
    <div className="chat-room" onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <header className="chat-header">
        <a className="icon-btn back-btn" href="#/" aria-label="뒤로">
          ‹
        </a>
        <div className="chat-title">
          <strong>{room.name}</strong>
          <button className="member-count" onClick={() => setShowMembers(true)}>
            👤 {members.length}
          </button>
        </div>
        <div className="header-actions">
          <button className="btn small ghost" onClick={() => copyText(inviteText(), '초대 안내문을 복사했습니다.')}>
            초대
          </button>
          <button className="btn small ghost" onClick={() => setShowMembers(true)}>
            참여자
          </button>
          <button className="btn small ghost" onClick={leave}>
            나가기
          </button>
        </div>
      </header>

      {notice && (
        <NoticeBar
          notice={notice}
          isAdmin={isAdmin}
          onOpenImage={() => setViewer(notice)}
          onClear={() => setNoticeMessage(null)}
        />
      )}

      <div className="message-list" ref={listRef} onScroll={onScroll}>
        {hasMore && <div className="load-older muted">{loadingOlder ? '이전 대화 불러오는 중…' : '위로 스크롤하면 이전 대화를 불러옵니다'}</div>}
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(msg.created_at)
          const sameGroup = (a, b) =>
            a && b && a.kind !== 'system' && b.kind !== 'system' && a.user_id === b.user_id && minuteKey(a.created_at) === minuteKey(b.created_at)
          return (
            <div key={msg.id}>
              {newDay && (
                <div className="day-divider">
                  <span>{formatDay(msg.created_at)}</span>
                </div>
              )}
              <MessageItem
                msg={msg}
                mine={msg.user_id === me}
                member={membersById.get(msg.user_id)}
                showSender={newDay || !sameGroup(prev, msg)}
                showTime={!sameGroup(msg, next)}
                unread={msg.kind === 'system' ? 0 : unreadCount(msg)}
                isNotice={msg.id === noticeId}
                onOpenImage={() => setViewer(msg)}
                onMediaLoad={onMediaLoad}
                onMenu={(x, y) => setMenu({ x, y, msg })}
              />
            </div>
          )
        })}
        {pending.map((p) => (
          <div key={p.tempId} className="msg-row mine">
            <div className="msg-meta">
              {p.status === 'failed' ? (
                <span className="pending-actions">
                  <button onClick={() => uploadOne(p)}>재전송</button>
                  <button onClick={() => cancelPending(p)}>삭제</button>
                </span>
              ) : (
                <span className="muted">전송 중…</span>
              )}
            </div>
            <div className={'bubble image pending' + (p.status === 'failed' ? ' failed' : '')}>
              <img src={p.previewUrl} alt="" onLoad={onMediaLoad} />
            </div>
          </div>
        ))}
      </div>

      {newBelow && (
        <button className="new-below" onClick={scrollToBottom}>
          새 메시지 ↓
        </button>
      )}

      <Composer onSendText={sendText} onPickFiles={pickFiles} />

      {dragging && <div className="drop-overlay">여기에 사진을 놓으면 전송합니다</div>}

      {pickedFiles && <SendImagesModal files={pickedFiles} onSend={sendImages} onCancel={() => setPickedFiles(null)} />}

      {viewer && <ImageViewer msg={viewer} onClose={() => setViewer(null)} />}

      {showMembers && (
        <MembersPanel
          room={room}
          members={members}
          me={me}
          onCopyInvite={() => copyText(inviteText(), '초대 안내문을 복사했습니다.')}
          onClose={() => setShowMembers(false)}
        />
      )}

      {menu && (
        <MessageMenu
          menu={menu}
          isAdmin={isAdmin}
          isNotice={menu.msg.id === noticeId}
          onClose={() => setMenu(null)}
          onCopy={() => copyText(menu.msg.body)}
          onOpenImage={() => setViewer(menu.msg)}
          onNotice={(id) => setNoticeMessage(id)}
        />
      )}
    </div>
  )
}

function MessageMenu({ menu, isAdmin, isNotice, onClose, onCopy, onOpenImage, onNotice }) {
  const { x, y, msg } = menu
  const style = { left: Math.min(x, window.innerWidth - 170), top: Math.min(y, window.innerHeight - 140) }
  const act = (fn) => () => {
    fn()
    onClose()
  }
  return (
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <ul className="context-menu" style={style} onClick={(e) => e.stopPropagation()}>
        {msg.kind === 'text' && <li onClick={act(onCopy)}>복사</li>}
        {msg.kind === 'image' && !msg.image_expired && <li onClick={act(onOpenImage)}>크게 보기 / 저장</li>}
        {isAdmin && !isNotice && <li onClick={act(() => onNotice(msg.id))}>📢 공지로 등록</li>}
        {isAdmin && isNotice && <li onClick={act(() => onNotice(null))}>공지 해제</li>}
        <li className="muted" onClick={onClose}>
          닫기
        </li>
      </ul>
    </div>
  )
}
