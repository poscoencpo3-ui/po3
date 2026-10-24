import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'

const ERRORS = {
  TOO_OLD: '보낸 지 24시간이 지난 메시지는 수정할 수 없습니다.',
  NOT_ALLOWED: '내가 보낸 메시지만 수정할 수 있습니다.',
  NOT_EDITABLE: '수정할 수 없는 메시지입니다.',
}

export default function EditModal({ msg, onSaved, onClose }) {
  const [text, setText] = useState(msg.body)
  const [busy, setBusy] = useState(false)

  async function save() {
    const value = text.trim()
    if (!value) return
    if (value === msg.body) return onClose()
    setBusy(true)
    const { error } = await supabase.rpc('edit_message', { p_message_id: msg.id, p_body: value })
    setBusy(false)
    if (error) {
      const key = Object.keys(ERRORS).find((k) => error.message.includes(k))
      return toast(key ? ERRORS[key] : '수정에 실패했습니다. (v5 SQL을 실행했는지 확인해 주세요)')
    }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>✏️ 메시지 수정</h3>
        <div className="form-scroll">
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
            }}
          />
          <p className="muted small">보낸 지 24시간 이내의 글만 수정할 수 있고, 수정한 메시지에는 (수정됨)이 표시됩니다.</p>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={busy || !text.trim()} onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
