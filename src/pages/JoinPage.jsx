import { useState } from 'react'
import { supabase, APP_NAME } from '../lib/supabase'
import { navigate } from '../lib/router'

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

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!code.trim() || !name.trim()) {
      setError('입장코드와 이름을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      if (!session) {
        // 로그인 직후 채팅 목록으로 바뀌지 않도록 입장 화면 주소를 고정
        navigate('join')
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw new Error('접속에 실패했습니다. 잠시 후 다시 시도해 주세요. (' + authError.message + ')')
      }
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

        <div className="join-links">
          {session && <a href="#/">← 채팅 목록</a>}
          <a href="#/admin">관리자</a>
        </div>
      </form>
    </div>
  )
}
