import { useState } from 'react'
import { formatTime } from '../lib/format'
import { sendRemind } from '../lib/push'
import { toast } from '../lib/toast'

const REMIND_ERRORS = {
  TOO_SOON: '다시 알림은 1분에 한 번 보낼 수 있습니다. 잠시 뒤에 눌러 주세요.',
  NOT_ALLOWED: '보낸 사람과 관리자만 다시 알릴 수 있습니다.',
  NOT_URGENT: '확인 요청이 없는 메시지입니다.',
}

// 🚨 긴급 메시지를 누가 확인했는지 + 확인 안 한 사람에게 다시 알림
export default function AckPanel({ msg, info, canRemind, onAck, onClose }) {
  const [busy, setBusy] = useState(false)
  const waiting = info.targets.filter((p) => !info.ackedAt.has(p.person_id))
  const done = info.targets.filter((p) => info.ackedAt.has(p.person_id))

  async function remind() {
    setBusy(true)
    try {
      const res = await sendRemind(msg.id)
      toast(res.total ? `확인 안 한 ${waiting.length}명에게 다시 알렸습니다.` : '다시 알림을 보냈습니다. (알림을 켠 기기가 없는 사람은 앱을 열 때 보입니다)')
    } catch (err) {
      toast(REMIND_ERRORS[err.message] || '다시 알림에 실패했습니다. (v8 SQL과 push 함수를 반영했는지 확인해 주세요)')
    }
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal form-modal ack-modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          🚨 확인 현황 {info.acked}/{info.total}
        </h3>
        <div className="form-scroll">
          {info.pending && (
            <button className="btn urgent-ok" onClick={onAck}>
              ✅ 확인했습니다
            </button>
          )}
          <div className="ack-group">
            <div className="ack-title">⏳ 아직 확인 안 함 ({waiting.length})</div>
            {waiting.length === 0 ? (
              <div className="muted small">모두 확인했습니다.</div>
            ) : (
              <ul className="ack-list">
                {waiting.map((p) => (
                  <li key={p.person_id}>
                    {p.display_name}
                    {p.company && <span className="muted small"> {p.company}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="ack-group">
            <div className="ack-title">✅ 확인함 ({done.length})</div>
            <ul className="ack-list">
              {done.map((p) => (
                <li key={p.person_id}>
                  {p.display_name}
                  {p.company && <span className="muted small"> {p.company}</span>}
                  <span className="muted small ack-time">{formatTime(info.ackedAt.get(p.person_id))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="modal-actions">
          {canRemind && waiting.length > 0 && (
            <button className="btn danger-outline" disabled={busy} onClick={remind}>
              🔁 확인 안 한 {waiting.length}명에게 다시 알림
            </button>
          )}
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
