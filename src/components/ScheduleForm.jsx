import { useState } from 'react'
import { todayStr } from '../lib/format'

export default function ScheduleForm({ initial, isAdmin, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [start, setStart] = useState(initial?.start_date || todayStr())
  const [end, setEnd] = useState(initial?.end_date || initial?.start_date || todayStr())
  const [memo, setMemo] = useState(initial?.memo || '')
  const [pinned, setPinned] = useState(Boolean(initial?.pinned))
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    await onSave({ title: title.trim(), start_date: start, end_date: end < start ? start : end, memo: memo.trim(), pinned })
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>📅 {initial?.id ? '일정 수정' : '일정 등록'}</h3>
        <div className="form-scroll">
          <label>
            제목 *
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 25톤 크레인 반입" maxLength={100} autoFocus />
          </label>
          <div className="form-row">
            <label>
              시작일
              <input
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value)
                  if (end < e.target.value) setEnd(e.target.value)
                }}
                required
              />
            </label>
            <label>
              종료일
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required />
            </label>
          </div>
          <label>
            메모
            <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="장소, 담당자, 준비사항 등" maxLength={1000} />
          </label>
          {isAdmin && (
            <label className="check-row">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              채팅방 상단에 고정
            </label>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            취소
          </button>
          <button className="btn primary" disabled={busy || !title.trim()}>
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
