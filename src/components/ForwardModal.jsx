import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { forwardMessage } from '../lib/forward'
import { navigate } from '../lib/router'
import { previewText } from '../lib/format'
import { toast } from '../lib/toast'
import { FILES_BLOCKED_MESSAGE } from '../lib/files'
import Avatar from './Avatar'

export default function ForwardModal({ msg, me, currentRoomId, onClose }) {
  const [rooms, setRooms] = useState(null)
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.rpc('my_rooms').then(({ data }) => setRooms(data || []))
  }, [])

  async function send() {
    setBusy(true)
    try {
      await forwardMessage(msg, target.room_id, me)
      toast(`'${target.name}' 방으로 전달했습니다.`)
      onClose()
      if (target.room_id !== currentRoomId) navigate(`room/${target.room_id}`)
    } catch (err) {
      console.error(err)
      const blocked = msg.kind === 'file' && /FILES_BLOCKED|row-level security/.test(err?.message || '')
      toast(blocked ? FILES_BLOCKED_MESSAGE : '전달에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>↪️ 전달하기</h3>
        <div className="forward-preview muted small ellipsis">
          {previewText(msg.kind, msg.kind === 'file' ? msg.file_name : msg.body)}
        </div>
        <div className="form-scroll">
          {rooms === null && <p className="muted small">불러오는 중…</p>}
          <ul className="forward-rooms">
            {(rooms || []).map((r) => {
              // 파일은 파일 제한 방(내가 파일 금지인 경우)으로 전달할 수 없음
              const locked = msg.kind === 'file' && r.files_blocked
              return (
                <li key={r.room_id}>
                  <button
                    className={(target?.room_id === r.room_id ? 'active' : '') + (locked ? ' locked' : '')}
                    onClick={() => (locked ? toast(FILES_BLOCKED_MESSAGE) : setTarget(r))}
                  >
                    <Avatar name={r.name} seed={r.room_id} size={36} square />
                    <span className="ellipsis">
                      {r.name}
                      {r.room_id === currentRoomId && <span className="muted small"> (현재 방)</span>}
                    </span>
                    <span className="muted small">{locked ? '📎 파일 제한' : `${r.member_count}명`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={!target || busy} onClick={send}>
            {busy ? '전달 중…' : '전달'}
          </button>
        </div>
      </div>
    </div>
  )
}
