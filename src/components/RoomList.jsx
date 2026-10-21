import { useState } from 'react'
import { APP_NAME } from '../lib/supabase'
import { formatListTime, previewText } from '../lib/format'
import { notifyPermission, notifySupported, requestNotifyPermission } from '../lib/notify'
import Avatar from './Avatar'

export default function RoomList({ rooms, activeRoomId, admin }) {
  const [permission, setPermission] = useState(notifyPermission)

  async function enableNotify() {
    setPermission(await requestNotifyPermission())
  }

  return (
    <aside className="room-list">
      <header className="room-list-header">
        <h1>{APP_NAME}</h1>
        <div className="header-actions">
          {admin && (
            <a className="btn small ghost" href="#/admin">
              관리
            </a>
          )}
          <a className="btn small" href="#/join">
            + 코드 입장
          </a>
        </div>
      </header>

      {notifySupported && permission === 'default' && (
        <button className="notify-banner" onClick={enableNotify}>
          🔔 새 메시지 알림을 받으려면 여기를 눌러 허용해 주세요
        </button>
      )}
      {permission === 'denied' && (
        <div className="notify-banner muted">알림이 차단되어 있습니다. 주소창 왼쪽 자물쇠 → 알림 → 허용</div>
      )}

      <ul className="rooms">
        {rooms === null && <li className="muted pad">불러오는 중…</li>}
        {rooms && rooms.length === 0 && (
          <li className="muted pad">
            참여 중인 채팅방이 없습니다.
            <br />
            <a href="#/join">입장코드로 들어가기</a>
          </li>
        )}
        {rooms &&
          rooms.map((r) => (
            <li key={r.room_id}>
              <a href={`#/room/${r.room_id}`} className={'room-item' + (r.room_id === activeRoomId ? ' active' : '')}>
                <Avatar name={r.name} seed={r.room_id} size={46} square />
                <div className="room-main">
                  <div className="room-top">
                    <span className="room-name">{r.name}</span>
                    <span className="room-count">{r.member_count}</span>
                    <span className="room-time">{formatListTime(r.last_at)}</span>
                  </div>
                  <div className="room-bottom">
                    <span className="room-preview">
                      {r.last_kind && r.last_kind !== 'system' && r.last_sender ? `${r.last_sender}: ` : ''}
                      {previewText(r.last_kind, r.last_body)}
                    </span>
                    {r.unread > 0 && <span className="badge">{r.unread > 999 ? '999+' : r.unread}</span>}
                  </div>
                </div>
              </a>
            </li>
          ))}
      </ul>
    </aside>
  )
}
