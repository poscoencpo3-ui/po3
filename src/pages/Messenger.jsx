import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { onRealtime, startRealtime } from '../lib/realtime'
import { previewText } from '../lib/format'
import { setTitleUnread, showNotification } from '../lib/notify'
import RoomList from '../components/RoomList'
import ChatRoom from '../components/ChatRoom'

export default function Messenger({ session, admin, route }) {
  const me = session.user.id
  const activeRoomId = route.name === 'room' ? route.id : null
  const [rooms, setRooms] = useState(null)
  const [connected, setConnected] = useState(true)
  const roomsRef = useRef([])
  const activeRef = useRef(activeRoomId)
  activeRef.current = activeRoomId

  const loadRooms = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_rooms')
    if (error) return
    roomsRef.current = data
    setRooms(data)
  }, [])

  // 이벤트가 몰려 와도 목록은 잠깐 모았다가 한 번만 새로 불러옴
  const refreshTimer = useRef(null)
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(loadRooms, 400)
  }, [loadRooms])

  useEffect(() => {
    loadRooms()
    return () => clearTimeout(refreshTimer.current)
  }, [loadRooms])

  useEffect(() => startRealtime(), [me])

  useEffect(
    () =>
      onRealtime((evt) => {
        if (evt.type === 'status') {
          setConnected(evt.status === 'SUBSCRIBED')
        } else if (evt.type === 'message') {
          scheduleRefresh()
          const row = evt.row
          if (row.kind === 'system' || row.user_id === me) return
          const viewing = row.room_id === activeRef.current && !document.hidden && document.hasFocus()
          if (!viewing) {
            const room = roomsRef.current.find((r) => r.room_id === row.room_id)
            showNotification(room ? room.name : '새 메시지', `${row.sender_name}: ${previewText(row.kind, row.body)}`, row.room_id)
          }
        } else if (evt.type === 'member') {
          // 다른 사람의 읽음 표시 변경은 목록과 무관하므로 무시
          if (evt.event !== 'UPDATE' || evt.row.user_id === me) scheduleRefresh()
        } else if (evt.type === 'room' || evt.type === 'resync') {
          scheduleRefresh()
        }
      }),
    [me, scheduleRefresh]
  )

  const totalUnread = (rooms || []).reduce((sum, r) => sum + r.unread, 0)
  useEffect(() => setTitleUnread(totalUnread), [totalUnread])

  return (
    <div className={'messenger' + (activeRoomId ? ' has-room' : '')}>
      {!connected && <div className="offline-bar">연결이 끊겼습니다. 다시 연결하는 중…</div>}
      <RoomList rooms={rooms} activeRoomId={activeRoomId} admin={admin} />
      <main className="chat-pane">
        {activeRoomId ? (
          <ChatRoom key={activeRoomId} roomId={activeRoomId} me={me} isAdmin={Boolean(admin)} onRoomsChanged={loadRooms} />
        ) : (
          <div className="chat-empty muted">
            <img src="/icon.svg" alt="" width="72" />
            <p>왼쪽에서 채팅방을 선택하세요</p>
          </div>
        )}
      </main>
    </div>
  )
}
