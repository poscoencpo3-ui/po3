import { useEffect, useState } from 'react'
import { ensurePush, isIOS, isStandalone, pushError, pushSupported, sendTestPush, showLocalTest } from '../lib/push'
import { notifyPermission, requestNotifyPermission } from '../lib/notify'

const WINDOWS_HELP = (
  <ul>
    <li>
      <b>Win + I → 시스템 → 알림</b>에서 알림 <b>켬</b>, 방해 금지 <b>끔</b>
    </li>
    <li>
      같은 화면 아래 목록에서 <b>Microsoft Edge / Google Chrome</b> 켬 → 눌러서 <b>알림 배너 표시</b> 켬
    </li>
    <li>
      <b>Win + N</b>(알림 센터)에 테스트 알림이 쌓여 있다면, 화면 팝업만 꺼져 있는 것입니다
    </li>
    <li>위 설정이 회사 정책으로 잠겨 있으면 전산 담당자에게 브라우저 알림 허용을 요청해야 합니다</li>
  </ul>
)

function Row({ label, state, children }) {
  const icon = { ok: '✅', bad: '❌', warn: '⚠️', wait: '⏳' }[state]
  return (
    <div className={'check-item ' + state}>
      <span className="check-icon">{icon}</span>
      <div>
        <div className="check-label">{label}</div>
        {children && <div className="small check-detail">{children}</div>}
      </div>
    </div>
  )
}

export default function NotifyTest({ onClose }) {
  const [permission, setPermission] = useState(notifyPermission())
  const [registered, setRegistered] = useState(null) // null=확인 중, true, false
  const [local, setLocal] = useState(null) // null | 'asked' | 'yes' | 'no'
  const [server, setServer] = useState(null) // { phase: 'countdown', n } | { phase: 'sending' } | { phase: 'done', data } | { phase: 'error', message }
  const [serverSeen, setServerSeen] = useState(null)

  async function check() {
    setRegistered(null)
    setRegistered(await ensurePush())
  }

  useEffect(() => {
    if (permission === 'granted') check()
    else setRegistered(false)
  }, [permission])

  async function allow() {
    setPermission(await requestNotifyPermission())
  }

  async function testLocal() {
    try {
      await showLocalTest()
      setLocal('asked')
    } catch {
      setLocal('no')
    }
  }

  function testServer() {
    setServerSeen(null)
    let n = 5
    setServer({ phase: 'countdown', n })
    const timer = setInterval(async () => {
      n -= 1
      if (n > 0) return setServer({ phase: 'countdown', n })
      clearInterval(timer)
      setServer({ phase: 'sending' })
      try {
        setServer({ phase: 'done', data: await sendTestPush() })
      } catch (err) {
        setServer({ phase: 'error', message: err.message })
      }
    }, 1000)
  }

  const iosNeedsInstall = isIOS && !isStandalone

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal notify-test" onClick={(e) => e.stopPropagation()}>
        <h3>🔔 알림 테스트</h3>
        <div className="form-scroll">
          {iosNeedsInstall && (
            <Row label="아이폰은 홈 화면에 추가해야 알림을 받을 수 있습니다" state="warn">
              공유 버튼(□↑) → 홈 화면에 추가 → 홈 화면 아이콘으로 열어서 다시 테스트하세요.
            </Row>
          )}

          <div className="check-title">상태 점검</div>
          {permission === 'granted' && <Row label="브라우저 알림 권한: 허용됨" state="ok" />}
          {permission === 'default' && (
            <Row label="브라우저 알림 권한: 아직 허용 안 함" state="warn">
              <button className="btn small primary" onClick={allow}>
                알림 허용하기
              </button>
            </Row>
          )}
          {permission === 'denied' && (
            <Row label="브라우저 알림 권한: 차단됨" state="bad">
              주소창 왼쪽 자물쇠 🔒 → 이 사이트에 대한 권한 → 알림 → <b>허용</b> → 새로고침(F5)
            </Row>
          )}
          {(permission === 'unsupported' || !pushSupported) && <Row label="이 브라우저는 알림을 지원하지 않습니다" state="bad" />}

          {permission === 'granted' && registered === null && <Row label="알림 등록 확인 중…" state="wait" />}
          {permission === 'granted' && registered === true && (
            <Row label="알림 등록: 서버에 저장됨" state="ok">
              사이트를 닫아도 알림을 받을 수 있는 상태입니다.
            </Row>
          )}
          {permission === 'granted' && registered === false && (
            <Row label="알림 등록: 실패" state="bad">
              {pushError()}{' '}
              <button className="btn small" onClick={check}>
                다시 시도
              </button>
            </Row>
          )}

          {permission === 'granted' && (
            <>
              <div className="check-title">1단계 · 화면 표시 확인</div>
              <p className="small muted">서버를 거치지 않고 이 브라우저가 바로 알림을 띄웁니다. Windows가 알림을 보여주는지 확인합니다.</p>
              <button className="btn block" onClick={testLocal}>
                지금 알림 띄우기
              </button>
              {local === 'asked' && (
                <div className="ask-row">
                  <span>오른쪽 아래에 알림이 떴나요?</span>
                  <button className="btn small primary" onClick={() => setLocal('yes')}>
                    떴어요
                  </button>
                  <button className="btn small" onClick={() => setLocal('no')}>
                    안 떴어요
                  </button>
                </div>
              )}
              {local === 'yes' && <Row label="화면 표시 정상" state="ok" />}
              {local === 'no' && (
                <Row label="Windows가 알림을 화면에 표시하지 않고 있습니다" state="bad">
                  {WINDOWS_HELP}
                </Row>
              )}

              <div className="check-title">2단계 · 서버 알림 확인</div>
              <p className="small muted">
                5초 뒤 서버가 이 기기로 알림을 보냅니다. <b>그 사이에 창을 최소화</b>해 보세요. 사이트를 닫아도 오는 알림과 같은 경로입니다.
              </p>
              <button className="btn block primary" onClick={testServer} disabled={server && ['countdown', 'sending'].includes(server.phase)}>
                {server?.phase === 'countdown' ? `${server.n}초 뒤 발송… 지금 최소화하세요` : server?.phase === 'sending' ? '발송 중…' : '서버 알림 보내기 (5초 뒤)'}
              </button>
              {server?.phase === 'error' && (
                <Row label="알림 서버 호출 실패" state="bad">
                  push 함수에 연결하지 못했습니다. ({server.message})
                </Row>
              )}
              {server?.phase === 'done' && server.data.total === 0 && (
                <Row label="이 계정에 등록된 기기가 없습니다" state="bad">
                  위의 '알림 등록'을 먼저 해결해야 합니다.
                </Row>
              )}
              {server?.phase === 'done' && server.data.total > 0 && server.data.sent === 0 && (
                <Row label="서버가 보냈지만 푸시 서비스가 거절했습니다" state="bad">
                  {server.data.results.map((r, i) => (
                    <div key={i}>
                      {r.service}: {r.status || '연결 실패'} {r.detail}
                    </div>
                  ))}
                  이 화면을 캡쳐해서 담당자에게 보내주세요.
                </Row>
              )}
              {server?.phase === 'done' && server.data.sent > 0 && (
                <>
                  <Row label={`서버 발송 성공 (${server.data.sent}/${server.data.total}개 기기)`} state="ok" />
                  {serverSeen === null && (
                    <div className="ask-row">
                      <span>'알림 테스트' 알림이 떴나요?</span>
                      <button className="btn small primary" onClick={() => setServerSeen(true)}>
                        떴어요
                      </button>
                      <button className="btn small" onClick={() => setServerSeen(false)}>
                        안 떴어요
                      </button>
                    </div>
                  )}
                  {serverSeen === true && <Row label="모든 점검 통과! 사이트를 닫아도 알림이 옵니다 🎉" state="ok" />}
                  {serverSeen === false && (
                    <Row label="푸시 서비스에서 이 PC까지 전달되지 않았습니다" state="bad">
                      회사 네트워크가 마이크로소프트/구글 푸시 서버 연결을 막고 있을 가능성이 큽니다. 1단계가 정상이라면, 사이트를 <b>최소화한 상태로 열어 두면</b> 알림을 받을 수 있습니다.
                    </Row>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
