import { useEffect, useState } from 'react'
import { supabase, isConfigured, APP_NAME } from './lib/supabase'
import { useRoute } from './lib/router'
import { useToast } from './lib/toast'
import JoinPage from './pages/JoinPage'
import AdminPage from './pages/AdminPage'
import Messenger from './pages/Messenger'

export default function App() {
  const route = useRoute()
  const toastMessage = useToast()
  const [session, setSession] = useState(undefined) // undefined = 확인 중
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    document.title = APP_NAME
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const isAnonymous = session?.user?.is_anonymous
  useEffect(() => {
    setAdmin(null)
    if (!userId || isAnonymous) return
    supabase
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setAdmin(data))
  }, [userId, isAnonymous])

  let page
  if (!isConfigured) {
    page = <SetupNotice />
  } else if (session === undefined) {
    page = <div className="center-screen muted">불러오는 중…</div>
  } else if (route.name === 'admin') {
    page = <AdminPage session={session} admin={admin} onAdminChange={setAdmin} />
  } else if (!session || route.name === 'join') {
    page = <JoinPage session={session} admin={admin} initialCode={route.name === 'join' ? route.id : ''} />
  } else {
    page = <Messenger session={session} admin={admin} route={route} />
  }

  return (
    <>
      {page}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  )
}

function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card">
        <h2>설정이 필요합니다</h2>
        <p>
          <code>.env</code> 파일(또는 호스팅의 환경변수)에 <code>VITE_SUPABASE_URL</code>,{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> 를 넣어주세요.
        </p>
        <p className="muted">자세한 방법은 docs/SETUP.md 를 참고하세요.</p>
      </div>
    </div>
  )
}
