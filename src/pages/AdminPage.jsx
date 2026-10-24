import { useCallback, useEffect, useState } from 'react'
import { supabase, APP_NAME } from '../lib/supabase'
import { navigate } from '../lib/router'
import { formatCode, formatListTime } from '../lib/format'
import { copyText, toast } from '../lib/toast'
import IntegrationsModal from '../components/IntegrationsModal'

export default function AdminPage({ session, admin, onAdminChange }) {
  if (!session || session.user.is_anonymous) return <AdminLogin hasGuestSession={Boolean(session)} />
  if (!admin) {
    return (
      <div className="center-screen">
        <div className="card">
          <h2>관리자 권한이 없습니다</h2>
          <p className="muted">{session.user.email} 계정이 관리자 목록(admins)에 등록되어 있지 않습니다.</p>
          <button className="btn block" onClick={() => supabase.auth.signOut()}>
            로그아웃
          </button>
        </div>
      </div>
    )
  }
  return <AdminDashboard admin={admin} onAdminChange={onAdminChange} />
}

function AdminLogin({ hasGuestSession }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    setBusy(false)
  }

  return (
    <div className="center-screen join-bg">
      <form className="card join-card" onSubmit={submit}>
        <h1>관리자 로그인</h1>
        <p className="muted">{APP_NAME} 채팅방 관리</p>
        <label>
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          비밀번호
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {hasGuestSession && (
          <p className="warn small">
            이 브라우저는 참여자로 입장한 상태입니다. 관리자로 로그인하면 참여자 계정에서 로그아웃되며, 해당 방들에 다시 들어가려면
            입장코드가 필요합니다.
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
        <div className="join-links">
          <a href="#/">← 돌아가기</a>
        </div>
      </form>
    </div>
  )
}

function AdminDashboard({ admin, onAdminChange }) {
  const [rooms, setRooms] = useState(null)
  const [newName, setNewName] = useState('')
  const [profile, setProfile] = useState({ display_name: admin.display_name, company: admin.company })
  const [busy, setBusy] = useState(false)
  const [integrationRoom, setIntegrationRoom] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_members(count)')
      .order('created_at', { ascending: false })
    if (error) toast('목록을 불러오지 못했습니다.')
    setRooms(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createRoom(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const { error } = await supabase.rpc('create_room', { p_name: newName.trim() })
    setBusy(false)
    if (error) return toast('방 만들기에 실패했습니다.')
    setNewName('')
    toast('채팅방을 만들었습니다.')
    load()
  }

  async function toggleRoomNotify(room) {
    const enable = room.notifications_enabled === false
    const msg = enable
      ? `'${room.name}' 방의 알림을 켤까요?`
      : `'${room.name}' 방의 알림을 모든 참여자에게서 끌까요?\n안 읽은 숫자는 계속 표시되고, 🚨 긴급 메시지는 알림이 갑니다.`
    if (!window.confirm(msg)) return
    const { error } = await supabase.rpc('set_room_notifications', { p_room: room.id, p_enabled: enable })
    if (error) return toast('변경에 실패했습니다. (v5 SQL을 실행했는지 확인해 주세요)')
    toast(enable ? '🔔 알림을 켰습니다.' : '🔕 알림을 껐습니다.')
    load()
  }

  async function enter(room) {
    const { data, error } = await supabase.rpc('join_room', {
      p_code: room.code,
      p_name: admin.display_name,
      p_company: admin.company,
    })
    if (error || !data) return toast('입장에 실패했습니다.')
    navigate(`room/${data}`)
  }

  async function saveProfile(e) {
    e.preventDefault()
    const { error } = await supabase.rpc('update_my_profile', {
      p_name: profile.display_name.trim(),
      p_company: profile.company.trim(),
    })
    if (error) return toast('저장에 실패했습니다. (v4 SQL을 실행했는지 확인해 주세요)')
    onAdminChange({ ...admin, display_name: profile.display_name.trim(), company: profile.company.trim() })
    toast('저장했습니다. 모든 채팅방에 바로 적용됩니다.')
  }

  function inviteText(room) {
    const link = `${location.origin}${location.pathname}#/join/${room.code}`
    return `[${APP_NAME}] ${room.name}\n입장코드: ${formatCode(room.code)}\n접속주소: ${link}`
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>관리자 · {APP_NAME}</h1>
        <div className="header-actions">
          <a className="btn small" href="#/">
            채팅 목록
          </a>
          <button className="btn small ghost" onClick={() => supabase.auth.signOut().then(() => navigate(''))}>
            로그아웃
          </button>
        </div>
      </header>

      <section className="card">
        <h2>새 채팅방 만들기</h2>
        <form className="inline-form" onSubmit={createRoom}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예: OO현장 협력사 소통방"
            maxLength={50}
          />
          <button className="btn primary" disabled={busy || !newName.trim()}>
            만들기
          </button>
        </form>
        <p className="muted small">만들면 8자리 입장코드가 자동으로 발급됩니다. 코드를 협력사 담당자에게 전달하세요.</p>
      </section>

      <section className="card">
        <h2>채팅방 목록</h2>
        {rooms === null && <p className="muted">불러오는 중…</p>}
        {rooms && rooms.length === 0 && <p className="muted">아직 만든 채팅방이 없습니다.</p>}
        {rooms && rooms.length > 0 && (
          <div className="table-wrap">
            <table className="room-table">
              <thead>
                <tr>
                  <th>방 이름</th>
                  <th>입장코드</th>
                  <th>인원</th>
                  <th>만든 날</th>
                  <th>알림</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="mono">{formatCode(r.code)}</td>
                    <td>{r.room_members?.[0]?.count ?? 0}</td>
                    <td>{formatListTime(r.created_at)}</td>
                    <td>
                      <button
                        className={'btn small notify-toggle' + (r.notifications_enabled === false ? ' off' : '')}
                        onClick={() => toggleRoomNotify(r)}
                        title="이 방 모든 참여자의 알림을 켜고 끕니다"
                      >
                        {r.notifications_enabled === false ? '🔕 꺼짐' : '🔔 켜짐'}
                      </button>
                    </td>
                    <td className="row-actions">
                      <button className="btn small" onClick={() => copyText(inviteText(r), '초대 안내문을 복사했습니다.')}>
                        초대문 복사
                      </button>
                      <button className="btn small" onClick={() => setIntegrationRoom(r)}>
                        📌 연동
                      </button>
                      <button className="btn small primary" onClick={() => enter(r)}>
                        입장
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {integrationRoom && <IntegrationsModal room={integrationRoom} onClose={() => setIntegrationRoom(null)} />}

      <section className="card">
        <h2>내 표시 정보</h2>
        <form className="inline-form" onSubmit={saveProfile}>
          <input
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            placeholder="이름"
            maxLength={20}
          />
          <input
            value={profile.company}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            placeholder="소속"
            maxLength={30}
          />
          <button className="btn">저장</button>
        </form>
      </section>
    </div>
  )
}
