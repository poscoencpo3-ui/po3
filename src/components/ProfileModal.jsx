import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'

const PROFILE_KEY = 'po3.profile'

export default function ProfileModal({ member, onSaved, onClose }) {
  const [name, setName] = useState(member?.display_name || '')
  const [company, setCompany] = useState(member?.company || '')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const { error } = await supabase.rpc('update_my_profile', { p_name: name.trim(), p_company: company.trim() })
    setBusy(false)
    if (error) return toast('변경에 실패했습니다. (v4 SQL을 실행했는지 확인해 주세요)')
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: name.trim(), company: company.trim() }))
    } catch {
      // 다음 입장 때 기본값으로 쓰는 용도라 저장 실패해도 무방
    }
    toast('모든 채팅방에 바로 적용했습니다.')
    onSaved?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>👤 내 정보 수정</h3>
        <div className="form-scroll">
          <label>
            이름 *
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
          </label>
          <label>
            소속
            <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={30} />
          </label>
          <p className="muted small">참여 중인 모든 채팅방과 지난 메시지에 바로 적용됩니다. 이름을 바꾸면 채팅방에 변경 안내가 표시됩니다.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={busy || !name.trim()}>
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
