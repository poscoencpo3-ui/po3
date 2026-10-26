import { useState } from 'react'
import { supabase, APP_NAME } from '../lib/supabase'
import { navigate } from '../lib/router'
import { linkDevice, reloadAfterLink } from '../components/LinkDeviceModal'

const PROFILE_KEY = 'po3.profile'

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}
  } catch {
    return {}
  }
}

const ERRORS = {
  TOO_MANY_ATTEMPTS: '코드를 여러 번 틀렸습니다. 10분 뒤에 다시 시도해 주세요.',
  NAME_REQUIRED: '이름을 입력해 주세요.',
}

export default function JoinPage({ session, admin, initialCode }) {
  const saved = loadProfile()
  const [code, setCode] = useState(initialCode || '')
  const [name, setName] = useState(admin?.display_name || saved.name || '')
  const [company, setCompany] = useState(admin?.company ?? saved.company ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkMode, setLinkMode] = useState(false)
  const [linkCode, setLinkCode] = useState('')

  async function signInIfNeeded() {
    if (session) return
    // 로그인 직후 채팅 목록으로 바뀌지 않도록 입장 화면 주소를 고정
    navigate('join')
    const { error: authError } = await supabase.auth.signInAnonymously()
    if (authError) throw new Error('접속에 실패했습니다. 잠시 후 다시 시도해 주세요. (' + authError.message + ')')
  }

  // 이미 쓰는 기기(PC 등)에서 만든 연결 코드로, 이 기기를 같은 사람으로 입장
  async function submitLink(e) {
    e.preventDefault()
    setError('')
    if (linkCode.replace(/\D/g, '').length !== 6) return setError('연결 코드 6자리를 입력해 주세요.')
    setBusy(true)
    try {
      await signInIfNeeded()
      await linkDevice(linkCode)
      reloadAfterLink()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!code.trim() || !name.trim()) {
      setError('입장코드와 이름을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      await signInIfNeeded()
      const { data: roomId, error: rpcError } = await supabase.rpc('join_room', {
        p_code: code,
        p_name: name.trim(),
        p_company: company.trim(),
      })
      if (rpcError) {
        const key = Object.keys(ERRORS).find((k) => rpcError.message.includes(k))
        throw new Error(key ? ERRORS[key] : rpcError.message)
      }
      if (!roomId) throw new Error('입장코드가 올바르지 않습니다. 다시 확인해 주세요.')
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: name.trim(), company: company.trim() }))
      navigate(`room/${roomId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (linkMode) {
    return (
      <div className="center-screen join-bg">
        <form className="card join-card" onSubmit={submitLink}>
          <img src="/icon.svg" alt="" className="join-logo" />
          <h1>📱 연결 코드로 입장</h1>
          <p className="muted">
            이미 소통방을 쓰고 있는 기기(PC 등)에서 <b>📱 기기 연결</b> → <b>연결 코드 만들기</b>를 누르고, 나온 6자리 숫자를
            입력하세요.
          </p>
          <label>
            연결 코드
            <input
              className="code-input"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.replace(/[^\d ]/g, ''))}
              placeholder="123 456"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              autoFocus
            />
          </label>
          <p className="muted small">같은 사람으로 연결되어 참여 중인 방과 이름이 그대로 이어집니다.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? '연결 중…' : '연결하기'}
          </button>
          <div className="join-links">
            <a
              href="#/join"
              onClick={(e) => {
                e.preventDefault()
                setLinkMode(false)
                setError('')
              }}
            >
              ← 입장코드로 입장
            </a>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="center-screen join-bg">
      <form className="card join-card" onSubmit={submit}>
        <img src="/icon.svg" alt="" className="join-logo" />
        <h1>{APP_NAME}</h1>
        <p className="muted">전달받은 입장코드를 입력하세요</p>

        <label>
          입장코드
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-2345"
            autoComplete="off"
            maxLength={12}
            autoFocus={!initialCode}
          />
        </label>
        <label>
          이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" maxLength={20} />
        </label>
        <label>
          소속
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="OO건설" maxLength={30} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? '입장 중…' : '입장하기'}
        </button>

        <button
          type="button"
          className="btn ghost block"
          onClick={() => {
            setLinkMode(true)
            setError('')
          }}
        >
          📱 연결 코드로 입장 (다른 기기에서 쓰던 분)
        </button>

        <div className="join-links">
          {session && <a href="#/">← 채팅 목록</a>}
          <a href="#/admin">관리자</a>
        </div>
      </form>
    </div>
  )
}
