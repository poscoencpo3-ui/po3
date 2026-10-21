import { formatCode } from '../lib/format'
import Avatar from './Avatar'

export default function MembersPanel({ room, members, me, onCopyInvite, onClose }) {
  const sorted = [...members].sort(
    (a, b) => (b.user_id === me) - (a.user_id === me) || b.is_admin - a.is_admin || a.display_name.localeCompare(b.display_name, 'ko')
  )
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>참여자 {members.length}명</strong>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className="invite-box">
          <div className="muted small">입장코드</div>
          <div className="invite-code">{formatCode(room.code)}</div>
          <button className="btn small block" onClick={onCopyInvite}>
            초대 안내문 복사
          </button>
        </div>
        <ul className="member-list">
          {sorted.map((m) => (
            <li key={m.user_id}>
              <Avatar name={m.display_name} seed={m.user_id} size={36} />
              <div>
                <div>
                  {m.display_name}
                  {m.user_id === me && <span className="me-tag">나</span>}
                  {m.is_admin && <span className="admin-tag">관리자</span>}
                </div>
                {m.company && <div className="muted small">{m.company}</div>}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
