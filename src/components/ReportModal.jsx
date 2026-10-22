import { useState } from 'react'
import { todayStr } from '../lib/format'

const TEXTAREA_FIELDS = new Set(['work', 'safety', 'tomorrow'])

const FIELDS = [
  { key: 'date', label: '작업일', type: 'date' },
  { key: 'company', label: '업체', placeholder: 'OO건설' },
  { key: 'area', label: '공종/구간', placeholder: '예: 철근콘크리트 / 2공구 3층' },
  { key: 'work', label: '금일 작업 *', placeholder: '오늘 진행한 작업 내용' },
  { key: 'workers', label: '투입 인원', placeholder: '예: 12명 (형틀 8, 철근 4)' },
  { key: 'equipment', label: '장비', placeholder: '예: 25톤 크레인 1, 펌프카 1' },
  { key: 'safety', label: '안전/특이사항', placeholder: 'TBM 실시, 위험요인, 이슈 등' },
  { key: 'tomorrow', label: '명일 계획', placeholder: '내일 예정 작업' },
]

export default function ReportModal({ company, onSend, onCancel }) {
  const [data, setData] = useState({ date: todayStr(), company: company || '' })
  const set = (key) => (e) => setData({ ...data, [key]: e.target.value })

  function submit(e) {
    e.preventDefault()
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v))
    if (!clean.work) return
    onSend(clean)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>📝 작업일보</h3>
        <div className="form-scroll">
          {FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              {TEXTAREA_FIELDS.has(f.key) ? (
                <textarea rows={3} value={data[f.key] || ''} onChange={set(f.key)} placeholder={f.placeholder} maxLength={800} />
              ) : (
                <input type={f.type || 'text'} value={data[f.key] || ''} onChange={set(f.key)} placeholder={f.placeholder} maxLength={100} />
              )}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            취소
          </button>
          <button className="btn primary" disabled={!data.work?.trim()}>
            보내기
          </button>
        </div>
      </form>
    </div>
  )
}
