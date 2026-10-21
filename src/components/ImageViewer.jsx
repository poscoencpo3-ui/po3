import { useEffect, useState } from 'react'
import { getImageUrl } from '../lib/imageUrls'
import { fileStamp, formatDay, formatTime } from '../lib/format'
import { toast } from '../lib/toast'

export default function ImageViewer({ msg, onClose }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    getImageUrl(msg.image_path).then(setUrl).catch(() => toast('사진을 불러오지 못했습니다.'))
  }, [msg.image_path])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function download() {
    try {
      const blob = await (await fetch(url)).blob()
      const ext = msg.image_path.split('.').pop()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `사진_${fileStamp(msg.created_at)}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch {
      toast('저장에 실패했습니다.')
    }
  }

  return (
    <div className="viewer" onClick={onClose}>
      <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
        <span>
          {msg.sender_name} · {formatDay(msg.created_at)} {formatTime(msg.created_at)}
        </span>
        <div>
          <button className="btn small" onClick={download} disabled={!url}>
            저장
          </button>
          <button className="btn small ghost-dark" onClick={onClose}>
            닫기 ✕
          </button>
        </div>
      </div>
      {url ? <img src={url} alt="사진" onClick={(e) => e.stopPropagation()} /> : <p className="muted">불러오는 중…</p>}
    </div>
  )
}
