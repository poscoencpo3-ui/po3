import { useEffect, useMemo } from 'react'

export default function SendImagesModal({ files, onSend, onCancel }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSend(files)
      } else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [files, onSend, onCancel])

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>사진 {files.length}장을 보낼까요?</h3>
        <div className={'send-previews' + (files.length === 1 ? ' single' : '')}>
          {urls.map((u, i) => (
            <img key={u} src={u} alt={files[i].name} />
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            취소 (Esc)
          </button>
          <button className="btn primary" onClick={() => onSend(files)} autoFocus>
            전송 (Enter)
          </button>
        </div>
      </div>
    </div>
  )
}
