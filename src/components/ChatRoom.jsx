import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase, BUCKET, APP_NAME } from '../lib/supabase'
import { onRealtime } from '../lib/realtime'
import { navigate } from '../lib/router'
import { compressImage, extensionFor, imageFilesFrom } from '../lib/image'
import { primeImageUrl } from '../lib/imageUrls'
import { downloadFile, FILES_BUCKET, fileIcon, MAX_FILE_SIZE, storageExtension } from '../lib/files'
import { sendPush } from '../lib/push'
import { avatarColor, dayKey, formatCode, formatDay, MEMBER_COLORS, minuteKey, reportText } from '../lib/format'
import { copyText, toast } from '../lib/toast'
import MessageItem from './MessageItem'
import MessageMenu from './MessageMenu'
import Composer from './Composer'
import ImageViewer from './ImageViewer'
import SendImagesModal from './SendImagesModal'
import MembersPanel from './MembersPanel'
import NoticeBar from './NoticeBar'
import PinnedSchedules from './PinnedSchedules'
import CalendarPanel from './CalendarPanel'
import ScheduleForm from './ScheduleForm'
import ReportModal from './ReportModal'
import GalleryPanel from './GalleryPanel'
import SearchPanel from './SearchPanel'

const PAGE_SIZE = 50
const JUMP_WINDOW = 25

function mergeMessages(prev, rows) {
  if (!rows.length) return prev
  const byId = new Map(prev.map((m) => [m.id, m]))
  rows.forEach((r) => byId.set(r.id, r))
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

function upsertById(list, row) {
  return [...list.filter((x) => x.id !== row.id), row]
}

export default function ChatRoom({ roomId, me, isAdmin, onRoomsChanged }) {
  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [schedules, setSchedules] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [hasNewer, setHasNewer] = useState(false) // 검색으로 옛 대화로 이동한 상태
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState([]) // 전송 중인 사진/파일
  const [pickedFiles, setPickedFiles] = useState(null) // 전송 확인 대기 중인 사진
  const [viewer, setViewer] = useState(null)
  const [menu, setMenu] = useState(null)
  const [panel, setPanel] = useState(null) // members | calendar | gallery | search
  const [moreOpen, setMoreOpen] = useState(false)
  const [calendarFocus, setCalendarFocus] = useState(null)
  const [scheduleForm, setScheduleForm] = useState(null) // { initial }
  const [showReport, setShowReport] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [jumpTick, setJumpTick] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [newBelow, setNewBelow] = useState(false)

  const listRef = useRef(null)
  const atBottomRef = useRef(true)
  const scrollRestoreRef = useRef(null)
  const initialScrollRef = useRef(false)
  const jumpRef = useRef(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const hasNewerRef = useRef(hasNewer)
  hasNewerRef.current = hasNewer

  // ---------------- 불러오기 ----------------

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('room_members').select('*').eq('room_id', roomId)
    if (data) setMembers(data)
  }, [roomId])

  // 늦게 도착한 이전 요청 결과가 화면을 덮어쓰지 않도록 요청 번호로 구분
  const loadSeqRef = useRef(0)
  const initialInFlightRef = useRef(false)

  const loadInitial = useCallback(async () => {
    const seq = ++loadSeqRef.current
    initialInFlightRef.current = true
    const [roomRes, memberRes, msgRes, schedRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('room_members').select('*').eq('room_id', roomId),
      supabase.from('messages').select('*').eq('room_id', roomId).order('id', { ascending: false }).limit(PAGE_SIZE),
      supabase.from('schedules').select('*').eq('room_id', roomId).order('start_date'),
    ])
    if (seq !== loadSeqRef.current) return
    initialInFlightRef.current = false
    if (!roomRes.data) {
      setNotFound(true)
      return
    }
    initialScrollRef.current = false
    setRoom(roomRes.data)
    setMembers(memberRes.data || [])
    setSchedules(schedRes.data || [])
    const rows = (msgRes.data || []).reverse()
    setMessages(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setHasNewer(false)
    setNewBelow(false)
  }, [roomId])

  // 연결이 다시 됐을 때 놓친 내용만 이어 받기
  const resync = useCallback(async () => {
    const list = messagesRef.current
    if (!list.length) return initialInFlightRef.current ? undefined : loadInitial()
    const [roomRes, schedRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('schedules').select('*').eq('room_id', roomId).order('start_date'),
    ])
    if (roomRes.data) setRoom(roomRes.data)
    if (schedRes.data) setSchedules(schedRes.data)
    loadMembers()
    if (hasNewerRef.current) return
    const lastId = list[list.length - 1].id
    const { data } = await supabase.from('messages').select('*').eq('room_id', roomId).gt('id', lastId).order('id').limit(500)
    if (data && data.length) {
      if (!atBottomRef.current) setNewBelow(true)
      setMessages((prev) => mergeMessages(prev, data))
    }
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

  const loadingNewerRef = useRef(false)
  async function loadNewer() {
    if (loadingNewerRef.current || !hasNewer || !messages.length) return
    loadingNewerRef.current = true
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .gt('id', messages[messages.length - 1].id)
      .order('id')
      .limit(PAGE_SIZE)
    if (data) {
      setMessages((prev) => mergeMessages(prev, data))
      setHasNewer(data.length === PAGE_SIZE)
    }
    loadingNewerRef.current = false
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
          if (hasNewerRef.current) {
            setNewBelow(true)
            return
          }
          if (!atBottomRef.current && row.user_id !== me) setNewBelow(true)
          setMessages((prev) => mergeMessages(prev, [row]))
        } else if (evt.type === 'message-update' && row.room_id === roomId) {
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)))
          setNotice((n) => (n && n.id === row.id ? row : n))
        } else if (evt.type === 'member' && row.room_id === roomId) {
          if (evt.event === 'DELETE') setMembers((prev) => prev.filter((m) => m.user_id !== row.user_id))
          else setMembers((prev) => [...prev.filter((m) => m.user_id !== row.user_id), row])
        } else if (evt.type === 'room' && row.id === roomId) {
          setRoom(row)
        } else if (evt.type === 'schedule') {
          if (evt.event === 'DELETE') setSchedules((prev) => prev.filter((s) => s.id !== row.id))
          else if (row.room_id === roomId) setSchedules((prev) => upsertById(prev, row))
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

  // 참여자별 말풍선 색: 들어온 순서대로 서로 다른 색
  const colorOf = useMemo(() => {
    const sorted = [...members].sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    const map = new Map(sorted.map((m, i) => [m.user_id, MEMBER_COLORS[i % MEMBER_COLORS.length]]))
    return (userId) => map.get(userId) || MEMBER_COLORS[parseInt(avatarColor(userId || '').slice(1), 16) % MEMBER_COLORS.length]
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
    if (jumpRef.current) {
      const target = el.querySelector(`[data-id="${jumpRef.current}"]`)
      jumpRef.current = null
      initialScrollRef.current = true
      if (target) {
        target.scrollIntoView({ block: 'center' })
        atBottomRef.current = false
        return
      }
    }
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
  }, [messages, pending, jumpTick])

  function onScroll() {
    const el = listRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    atBottomRef.current = nearBottom && !hasNewer
    if (atBottomRef.current) setNewBelow(false)
    if (el.scrollTop < 60) loadOlder()
    if (nearBottom && hasNewer) loadNewer()
  }

  // 사진이 늦게 로드되며 높이가 바뀌어도 맨 아래를 유지
  function onMediaLoad() {
    if (atBottomRef.current) {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }

  // 검색 결과, 답장 원문 등으로 이동
  async function jumpTo(id) {
    if (!id) return
    setPanel(null)
    if (!messagesRef.current.some((m) => m.id === id)) {
      const [older, newer] = await Promise.all([
        supabase.from('messages').select('*').eq('room_id', roomId).lte('id', id).order('id', { ascending: false }).limit(JUMP_WINDOW),
        supabase.from('messages').select('*').eq('room_id', roomId).gt('id', id).order('id').limit(JUMP_WINDOW),
      ])
      const rows = [...(older.data || []).reverse(), ...(newer.data || [])]
      if (!rows.some((r) => r.id === id)) return toast('메시지를 찾을 수 없습니다.')
      loadSeqRef.current++ // 진행 중인 처음 불러오기 결과는 버림
      initialInFlightRef.current = false
      setHasMore((older.data || []).length === JUMP_WINDOW)
      setHasNewer((newer.data || []).length === JUMP_WINDOW)
      setMessages(rows)
    }
    jumpRef.current = id
    atBottomRef.current = false
    setJumpTick((t) => t + 1)
    setHighlightId(id)
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2200)
  }

  async function backToLatest() {
    await loadInitial()
  }

  // ---------------- 보내기 ----------------

  async function afterSend(row) {
    sendPush(row.id)
    if (hasNewerRef.current) {
      await backToLatest()
      return
    }
    atBottomRef.current = true
    setMessages((prev) => mergeMessages(prev, [row]))
  }

  async function insertMessage(values) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, user_id: me, ...values })
      .select()
      .single()
    if (error) throw error
    await afterSend(data)
    return data
  }

  async function sendText({ text, mentions, urgent }) {
    try {
      await insertMessage({ kind: 'text', body: text, mentions, is_urgent: urgent, reply_to: replyTo?.id ?? null })
      setReplyTo(null)
      return true
    } catch {
      toast('메시지 전송에 실패했습니다.')
      return false
    }
  }

  async function sendReport(data) {
    setShowReport(false)
    try {
      const body = `[작업일보] ${data.date || ''} ${data.company || ''} ${data.area || ''}\n${reportText(data)}`
      await insertMessage({ kind: 'report', data, body: body.slice(0, 5000) })
    } catch {
      toast('작업일보 전송에 실패했습니다.')
    }
  }

  const setPendingStatus = (tempId, status) => setPending((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, status } : p)))
  const removePending = (tempId) => setPending((prev) => prev.filter((p) => p.tempId !== tempId))

  async function uploadOne(item) {
    setPendingStatus(item.tempId, 'sending')
    try {
      if (item.kind === 'image') {
        const img = await compressImage(item.file)
        const path = `${roomId}/${crypto.randomUUID()}.${extensionFor(img.type)}`
        const up = await supabase.storage.from(BUCKET).upload(path, img.blob, { contentType: img.type, cacheControl: '31536000' })
        if (up.error) throw up.error
        primeImageUrl(path, item.previewUrl)
        await insertMessage({ kind: 'image', image_path: path, image_width: img.width, image_height: img.height })
      } else {
        const name = item.file.name.slice(-200)
        const path = `${roomId}/${crypto.randomUUID()}.${storageExtension(name)}`
        const up = await supabase.storage
          .from(FILES_BUCKET)
          .upload(path, item.file, { contentType: item.file.type || 'application/octet-stream' })
        if (up.error) throw up.error
        await insertMessage({ kind: 'file', file_path: path, file_name: name, file_size: item.file.size, body: name })
      }
      removePending(item.tempId)
    } catch (err) {
      console.error(err)
      setPendingStatus(item.tempId, 'failed')
    }
  }

  async function startUploads(items) {
    atBottomRef.current = true
    setPending((prev) => [...prev, ...items])
    for (const item of items) await uploadOne(item)
  }

  function sendImages(files) {
    setPickedFiles(null)
    startUploads(
      files.map((file) => ({ tempId: crypto.randomUUID(), kind: 'image', file, previewUrl: URL.createObjectURL(file), status: 'sending' }))
    )
  }

  function pickDocs(list) {
    const files = Array.from(list || [])
    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE)
    if (tooBig.length) toast(`20MB가 넘는 파일은 보낼 수 없습니다: ${tooBig.map((f) => f.name).join(', ')}`)
    const ok = files.filter((f) => f.size <= MAX_FILE_SIZE && f.size > 0)
    if (ok.length) startUploads(ok.map((file) => ({ tempId: crypto.randomUUID(), kind: 'file', file, status: 'sending' })))
  }

  function cancelPending(item) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    removePending(item.tempId)
  }

  function pickImages(list) {
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

  // 사진은 사진으로, 그 외는 파일로 전송
  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const all = Array.from(e.dataTransfer.files)
    const images = imageFilesFrom(all)
    if (images.length) setPickedFiles(images)
    const docs = all.filter((f) => !images.includes(f))
    if (docs.length) pickDocs(docs)
  }

  // ---------------- 메시지 메뉴 ----------------

  async function removeMessage(msg) {
    if (!window.confirm('이 메시지를 삭제할까요?\n모든 참여자 화면에서 "삭제된 메시지"로 바뀝니다.')) return
    const { error } = await supabase.rpc('delete_message', { p_message_id: msg.id })
    if (error) return toast('삭제에 실패했습니다.')
    const { data } = await supabase.from('messages').select('*').eq('id', msg.id).maybeSingle()
    if (data) setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)))
  }

  function download(msg) {
    downloadFile(msg.file_path, msg.file_name).catch(() => toast('파일을 받지 못했습니다.'))
  }

  // ---------------- 일정 ----------------

  async function saveSchedule(values) {
    const initial = scheduleForm?.initial
    const query = initial?.id
      ? supabase.from('schedules').update(values).eq('id', initial.id)
      : supabase.from('schedules').insert({ ...values, room_id: roomId, created_by: me })
    const { data, error } = await query.select().single()
    if (error) return toast('일정 저장에 실패했습니다.')
    setSchedules((prev) => upsertById(prev, data))
    setScheduleForm(null)
    toast(initial?.id ? '일정을 수정했습니다.' : '일정을 등록했습니다.')
  }

  async function deleteSchedule(s) {
    if (!window.confirm(`'${s.title}' 일정을 삭제할까요?`)) return
    const { error } = await supabase.from('schedules').delete().eq('id', s.id)
    if (error) return toast('삭제에 실패했습니다.')
    setSchedules((prev) => prev.filter((x) => x.id !== s.id))
  }

  async function togglePin(s) {
    const { data, error } = await supabase.from('schedules').update({ pinned: !s.pinned }).eq('id', s.id).select().single()
    if (error) return toast('변경에 실패했습니다.')
    setSchedules((prev) => upsertById(prev, data))
  }

  function openCalendar(date = null) {
    setCalendarFocus(date)
    setPanel('calendar')
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
  const myMember = membersById.get(me)

  return (
    <div className="chat-room" onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <header className="chat-header">
        <a className="icon-btn back-btn" href="#/" aria-label="뒤로">
          ‹
        </a>
        <div className="chat-title">
          <strong>{room.name}</strong>
          <button className="member-count" onClick={() => setPanel('members')}>
            👤 {members.length}
          </button>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setPanel('search')} title="대화 검색" aria-label="대화 검색">
            🔍
          </button>
          <button className="icon-btn" onClick={() => openCalendar()} title="일정" aria-label="일정">
            📅
          </button>
          <button className="icon-btn" onClick={() => setPanel('gallery')} title="사진·파일 모아보기" aria-label="사진·파일 모아보기">
            🖼️
          </button>
          <div className="more-wrap">
            <button className="icon-btn" onClick={() => setMoreOpen(!moreOpen)} title="더보기" aria-label="더보기">
              ☰
            </button>
            {moreOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMoreOpen(false)} />
                <ul className="dropdown" onClick={() => setMoreOpen(false)}>
                  <li onClick={() => copyText(inviteText(), '초대 안내문을 복사했습니다.')}>✉️ 초대 안내문 복사</li>
                  <li onClick={() => setPanel('members')}>👥 참여자 ({members.length})</li>
                  <li onClick={leave} className="danger">
                    🚪 채팅방 나가기
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <NoticeBar notice={notice} isAdmin={isAdmin} onOpenImage={() => setViewer(notice)} onClear={() => setNoticeMessage(null)} />
      )}
      <PinnedSchedules schedules={schedules} onOpen={openCalendar} />

      <div className="message-list" ref={listRef} onScroll={onScroll}>
        {hasMore && <div className="load-older muted">{loadingOlder ? '이전 대화 불러오는 중…' : '위로 스크롤하면 이전 대화를 불러옵니다'}</div>}
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(msg.created_at)
          const sameGroup = (a, b) =>
            a && b && a.kind !== 'system' && b.kind !== 'system' && a.user_id === b.user_id && minuteKey(a.created_at) === minuteKey(b.created_at)
          const mentionNames = (msg.mentions || []).map((id) => membersById.get(id)?.display_name).filter(Boolean)
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
                colors={colorOf(msg.user_id)}
                showSender={newDay || !sameGroup(prev, msg)}
                showTime={!sameGroup(msg, next)}
                unread={msg.kind === 'system' ? 0 : unreadCount(msg)}
                isNotice={msg.id === noticeId}
                highlighted={msg.id === highlightId}
                mentionNames={mentionNames}
                mentionsMe={(msg.mentions || []).includes(me)}
                onOpenImage={() => setViewer(msg)}
                onMediaLoad={onMediaLoad}
                onMenu={(x, y) => setMenu({ x, y, msg })}
                onJump={jumpTo}
                onDownload={() => download(msg)}
              />
            </div>
          )
        })}
        {!hasNewer &&
          pending.map((p) => (
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
              {p.kind === 'image' ? (
                <div className={'bubble image pending' + (p.status === 'failed' ? ' failed' : '')}>
                  <img src={p.previewUrl} alt="" onLoad={onMediaLoad} />
                </div>
              ) : (
                <div className={'bubble text card pending' + (p.status === 'failed' ? ' failed' : '')}>
                  <div className="file-card">
                    <span className="file-icon">{fileIcon(p.file.name)}</span>
                    <span className="file-info">
                      <span className="file-name">{p.file.name}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {(newBelow || hasNewer) && (
        <button className="new-below" onClick={hasNewer ? backToLatest : scrollToBottom}>
          {hasNewer ? '최신 메시지로 ↓' : '새 메시지 ↓'}
        </button>
      )}

      <Composer
        members={members}
        me={me}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={sendText}
        onPickImages={pickImages}
        onPickDocs={pickDocs}
        onOpenReport={() => setShowReport(true)}
        onOpenSchedule={() => setScheduleForm({ initial: null })}
      />

      {dragging && <div className="drop-overlay">여기에 놓으면 전송합니다 (사진·파일)</div>}

      {pickedFiles && <SendImagesModal files={pickedFiles} onSend={sendImages} onCancel={() => setPickedFiles(null)} />}
      {viewer && <ImageViewer msg={viewer} onClose={() => setViewer(null)} />}
      {showReport && <ReportModal company={myMember?.company} onSend={sendReport} onCancel={() => setShowReport(false)} />}
      {scheduleForm && (
        <ScheduleForm initial={scheduleForm.initial} isAdmin={isAdmin} onSave={saveSchedule} onCancel={() => setScheduleForm(null)} />
      )}

      {panel === 'members' && (
        <MembersPanel
          room={room}
          members={members}
          me={me}
          colorOf={colorOf}
          onCopyInvite={() => copyText(inviteText(), '초대 안내문을 복사했습니다.')}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'calendar' && (
        <CalendarPanel
          schedules={schedules}
          me={me}
          isAdmin={isAdmin}
          focusDate={calendarFocus}
          onAdd={(date) => setScheduleForm({ initial: { start_date: date } })}
          onEdit={(s) => setScheduleForm({ initial: s })}
          onDelete={deleteSchedule}
          onTogglePin={togglePin}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'gallery' && <GalleryPanel roomId={roomId} onOpenImage={setViewer} onJump={jumpTo} onClose={() => setPanel(null)} />}
      {panel === 'search' && <SearchPanel roomId={roomId} onJump={jumpTo} onClose={() => setPanel(null)} />}

      {menu && (
        <MessageMenu
          menu={menu}
          mine={menu.msg.user_id === me}
          isAdmin={isAdmin}
          isNotice={menu.msg.id === noticeId}
          onClose={() => setMenu(null)}
          actions={{
            reply: () => setReplyTo(menu.msg),
            copy: () => copyText(menu.msg.kind === 'report' ? reportText(menu.msg.data) : menu.msg.body),
            openImage: () => setViewer(menu.msg),
            downloadFile: () => download(menu.msg),
            schedule: () => setScheduleForm({ initial: { title: menu.msg.body.slice(0, 100) } }),
            notice: setNoticeMessage,
            remove: () => removeMessage(menu.msg),
          }}
        />
      )}
    </div>
  )
}
