import { useRef, useState } from 'react'
import { BACKGROUNDS, resolveBackground, saveBackground, savePhoto, selectedBackgroundId } from '../lib/theme'
import { toast } from '../lib/toast'

export default function BackgroundPicker({ roomId, roomName, onClose }) {
  const [onlyRoom, setOnlyRoom] = useState(() => Boolean(selectedBackgroundId(roomId, true)))
  const [, refresh] = useState(0)
  const fileRef = useRef(null)
  const current = resolveBackground(roomId).id

  function pick(id) {
    if (!saveBackground(id, onlyRoom ? roomId : null)) return toast('배경을 저장하지 못했습니다.')
    refresh((n) => n + 1)
  }

  async function pickPhoto(file) {
    if (!file) return
    if (!(await savePhoto(file))) return toast('사진이 너무 커서 저장하지 못했습니다. 다른 사진을 골라주세요.')
    pick('photo')
  }

  function toggleOnlyRoom(checked) {
    setOnlyRoom(checked)
    // 체크 해제하면 이 방만의 설정을 지우고 전체 배경을 따름
    if (!checked) saveBackground(null, roomId)
    refresh((n) => n + 1)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bg-picker" onClick={(e) => e.stopPropagation()}>
        <h3>🎨 배경화면</h3>
        <label className="check-row small">
          <input type="checkbox" checked={onlyRoom} onChange={(e) => toggleOnlyRoom(e.target.checked)} />
          이 방({roomName})에만 적용
        </label>
        <div className="bg-grid">
          {BACKGROUNDS.map((b) => (
            <button key={b.id} className={'bg-swatch' + (current === b.id ? ' active' : '')} onClick={() => pick(b.id)}>
              <span className="bg-preview" style={{ background: b.css }} />
              <span className="bg-name">{b.name}</span>
            </button>
          ))}
          <button className={'bg-swatch' + (current === 'photo' ? ' active' : '')} onClick={() => fileRef.current.click()}>
            <span className="bg-preview photo">🖼️</span>
            <span className="bg-name">내 사진</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files[0])} />
        <p className="muted small">이 PC에만 저장되며, 다른 참여자의 화면은 바뀌지 않습니다.</p>
        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
