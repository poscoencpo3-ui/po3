import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { requestResync } from '../lib/realtime'

const ERRORS = {
  ADMIN_MUST_CREATE_CODE: '관리자 계정은 관리자 기기에서 코드를 만들고, 다른 기기에서 그 코드를 입력해 주세요.',
  TOO_MANY_ATTEMPTS: '코드를 여러 번 틀렸습니다. 10분 뒤에 다시 시도해 주세요.',
}

export const formatLinkCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`

// 연결 코드 입력 → 이 기기를 코드를 만든 사람(기기)과 같은 사람으로 묶음
export async function linkDevice(code) {
  const digits = code.replace(/\D/g, '')
  if (digits.length !== 6) throw new Error('연결 코드 6자리를 입력해 주세요.')
  const { data, error } = await supabase.rpc('link_device', { p_code: digits })
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k))
    throw new Error(key ? ERRORS[key] : '연결에 실패했습니다. (v6 SQL을 실행했는지 확인해 주세요)')
  }
  if (!data) throw new Error('연결 코드가 맞지 않거나 10분이 지났습니다. 코드를 다시 만들어 주세요.')
  return data
}

// 연결 뒤에는 방 목록·이름·읽음 정보가 모두 바뀌므로 처음부터 다시 불러옴
export function reloadAfterLink() {
  location.hash = '#/'
  location.reload()
}

export default function LinkDeviceModal({ onClose }) {
  const [tab, setTab] = useState('create') // create | enter
  const [code, setCode] = useState(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [code])

  const left = Math.max(0, Math.round((expiresAt - now) / 1000))
  const expired = code && left === 0

  async function createCode() {
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('create_link_code')
    setBusy(false)
    if (rpcError) return setError('코드를 만들지 못했습니다. (v6 SQL을 실행했는지 확인해 주세요)')
    setCode(data)
    setExpiresAt(Date.now() + 10 * 60 * 1000)
    setNow(Date.now())
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await linkDevice(input)
      toast('연결되었습니다. 같은 사람으로 표시됩니다.')
      setTimeout(reloadAfterLink, 800)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  // 코드를 만든 기기는 상대 기기가 연결되면 방·참여자가 바뀌므로, 창을 닫을 때 다시 불러옴
  const close = () => {
    if (code) requestResync()
    onClose()
  }

  const switchTab = (next) => {
    setTab(next)
    setError('')
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal form-modal link-modal" onClick={(e) => e.stopPropagation()}>
        <h3>📱 다른 기기 연결</h3>
        <p className="muted small">PC와 휴대폰을 연결하면 참여자 목록에 한 사람으로 보이고, 읽음·알림 설정·방 목록이 함께 맞춰집니다.</p>
        <div className="tabs">
          <button className={tab === 'create' ? 'active' : ''} onClick={() => switchTab('create')}>
            코드 만들기
          </button>
          <button className={tab === 'enter' ? 'active' : ''} onClick={() => switchTab('enter')}>
            코드 입력
          </button>
        </div>

        {tab === 'create' ? (
          <div className="form-scroll">
            <p className="small">
              <b>지금 쓰고 있는 기기</b>에서 코드를 만들고, 연결할 기기에서 입력하세요.
            </p>
            {code && !expired ? (
              <>
                <div className="link-code">{formatLinkCode(code)}</div>
                <p className="muted small link-left">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} 동안 사용할 수 있습니다 (한 번만)
                </p>
                <ol className="small link-steps">
                  <li>연결할 기기에서 소통방 사이트를 엽니다</li>
                  <li>
                    처음이면 입장 화면의 <b>📱 연결 코드로 입장</b>, 이미 쓰던 기기면 <b>📱 기기 연결</b> → <b>코드 입력</b>
                  </li>
                  <li>위 6자리 숫자를 입력합니다</li>
                  <li>연결이 끝나면 이 창의 <b>닫기</b>를 누릅니다</li>
                </ol>
              </>
            ) : (
              <button className="btn primary block" disabled={busy} onClick={createCode}>
                {expired ? '시간이 지났습니다. 다시 만들기' : '연결 코드 만들기'}
              </button>
            )}
          </div>
        ) : (
          <form className="form-scroll" onSubmit={submit}>
            <p className="small">다른 기기에서 만든 6자리 연결 코드를 입력하세요.</p>
            <input
              className="code-input"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^\d ]/g, ''))}
              placeholder="123 456"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              autoFocus
            />
            <p className="muted small">이 기기의 이름과 방은 코드를 만든 기기 쪽으로 합쳐집니다.</p>
            <button className="btn primary block" disabled={busy}>
              {busy ? '연결 중…' : '연결하기'}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={close}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
