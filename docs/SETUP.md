# 설치·배포 가이드 (무료)

전체 소요 시간은 약 20~30분입니다. 아래 순서대로 진행하세요.

---

## 1단계. Supabase 프로젝트 만들기

1. https://supabase.com 에 GitHub 계정으로 가입합니다. (무료, 카드 등록 불필요)
2. **New project**
   - Name: `po3-talk` (자유롭게)
   - Database Password: 아무 값이나 만들어서 따로 보관
   - Region: **Northeast Asia (Seoul)** ← 꼭 서울을 선택하세요 (속도, 데이터 위치)
   - Plan: Free
3. 프로젝트가 만들어질 때까지 1~2분 기다립니다.

## 2단계. DB 스키마 적용

1. 왼쪽 메뉴에서 **SQL Editor** → **New query**를 엽니다.
2. 이 저장소의 `supabase/migrations/20261021000000_init.sql` 파일 내용을 **전부** 복사해서 붙여넣습니다.
3. **Run**을 누르고 `Success`가 뜨는지 확인합니다.

## 3단계. 익명 로그인 켜기 (참여자용)

참여자는 회원가입 없이 코드만으로 들어오기 때문에, 이 설정이 꼭 필요합니다.

- **Authentication** → **Sign In / Providers** → **Allow anonymous sign-ins** 를 **ON** → Save

## 4단계. 관리자 계정 만들기

1. **Authentication** → **Users** → **Add user** → **Create new user**
   - 이메일, 비밀번호 입력
   - **Auto Confirm User** 체크
2. **SQL Editor**에서 아래를 실행합니다. 이메일, 이름, 소속은 실제 값으로 바꾸세요.

```sql
insert into public.admins (user_id, display_name, company)
select id, '김관리', '포스코이앤씨'
from auth.users where email = 'admin@example.com';
```

관리자를 더 추가하려면 1~2번을 반복하면 됩니다.

## 5단계. API 키 확인

**Project Settings** → **API Keys**에서 아래 값을 확인합니다.

| 값 | 어디에 쓰나 | 공개 여부 |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | 웹사이트, 정리 스크립트 | 공개 가능 |
| **Publishable key** (`sb_publishable_...`)<br>또는 Legacy **anon** key | 웹사이트 | 공개 가능 (RLS로 보호됨) |
| **Secret key** (`sb_secret_...`)<br>또는 Legacy **service_role** key | 정리 스크립트(GitHub Secret)에만 | ⚠️ **절대 공개 금지** |

## 6단계. 웹사이트 배포 (Cloudflare Pages)

1. https://dash.cloudflare.com 에 가입합니다. (무료)
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 이 GitHub 저장소를 선택합니다.
3. 빌드 설정
   - Framework preset: `Vite` (없으면 None)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables**
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = Publishable key
   - `VITE_APP_NAME` = `협력사 소통방` (원하는 이름)
   - `NODE_VERSION` = `22`
5. **Save and Deploy** → 완료되면 `https://<프로젝트명>.pages.dev` 주소가 생깁니다.

> Vercel이나 Netlify도 같은 설정(빌드 명령 `npm run build`, 출력 `dist`, 환경변수 동일)으로 배포할 수 있습니다.

## 7단계. 사진 자동 정리 설정 (GitHub Actions)

매일 새벽 90일이 지난 사진·파일과, 사용자가 삭제한 메시지의 첨부를 지웁니다. 매일 Supabase에 접속하므로 **무료 프로젝트가 7일 비활성으로 일시정지되는 것도 막아줍니다.**

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Secret key (또는 service_role key)
2. **Actions** 탭 → `오래된 사진 정리 (매일)` → **Run workflow**를 눌러 한 번 실행해 보고, 초록색 체크가 뜨는지 확인합니다.

> 워크플로 파일이 저장소의 기본 브랜치(main)에 있어야 매일 자동으로 실행됩니다.

## 8단계. 사용해 보기

1. `https://<주소>/#/admin` → 관리자 로그인 → 방 만들기
2. **초대문 복사** → 협력사에 문자나 메일로 전달
3. 참여자는 링크를 열고 이름과 소속만 입력하면 입장됩니다. (링크에 코드가 들어 있음)

---

## v2 업데이트 적용 (일정·답장·삭제·파일·작업일보·멘션·푸시 알림)

이미 1차 버전을 쓰고 있다면 아래 3가지만 하면 됩니다. 처음 설치라면 2단계에서 `init.sql`을 실행한 다음 이어서 진행하세요.

### ① DB 업데이트
1. **SQL Editor** → **+ New query** → **Create a new snippet**
2. `supabase/migrations/20261022000000_v2.sql` 파일 내용을 **전부** 복사해서 붙여넣기 → **Run**
3. `Success. No rows returned`가 나오면 완료. **한 번만** 실행하세요.

### ② 푸시 알림 함수 배포 (사이트를 닫아도 알림)
1. 왼쪽 메뉴 **Edge Functions** → **Deploy a new function** → **Via Editor**
2. 함수 이름을 `push`로 바꿉니다. **반드시 소문자 `push`**
3. 편집기의 예시 코드를 모두 지우고, `supabase/functions/push/index.ts` 내용을 **전부** 붙여넣기
4. **Deploy function** 클릭
5. 배포된 함수 화면 → **Details**(또는 Settings) → **Verify JWT with legacy secret**(Enforce JWT verification)을 **끄기(OFF)** → Save
   - 로그인 확인은 함수 안에서 직접 하므로 꺼도 안전합니다.
6. (권장) **Edge Functions → Secrets** → `VAPID_SUBJECT` = `mailto:본인이메일` 추가

서명 키는 첫 알림을 보낼 때 자동으로 만들어지므로, 따로 키를 만들 필요가 없습니다.

### ③ 웹사이트
`main` 브랜치에 합쳐지면 Cloudflare가 자동으로 다시 배포합니다 (1~2분).

### 알림 테스트 (문제가 있을 때)
채팅 목록 맨 아래 **🔔 알림 테스트** 버튼을 누르면 순서대로 점검합니다.
1. **상태 점검**: 브라우저 알림 권한, 서버 알림 등록
2. **1단계 · 화면 표시**: 브라우저가 바로 알림을 띄웁니다. 안 뜨면 Windows 알림 설정 문제입니다.
3. **2단계 · 서버 알림**: 5초 뒤 서버가 내 기기로 알림을 보냅니다. 창을 최소화하고 확인하세요.

> 회사망에서 푸시 서버 연결이 막혀 있어도, **사이트를 최소화해서 열어 두면** 4초 안에 알림이 뜹니다.

### 알림 켜기 (각 사용자)
- **PC (Chrome/Edge)**: 채팅 목록 위의 **🔔 알림 허용** 띠 클릭 → 허용
- **안드로이드**: 같은 방법. 홈 화면에 추가하면 앱처럼 쓸 수 있습니다.
- **아이폰**: 사파리 **공유 버튼(□↑) → 홈 화면에 추가** → 홈 화면 아이콘으로 열기 → 알림 허용 (iOS 16.4 이상)

---

## v3 업데이트: 외부 사이트 연동 (화이트보드 포스트잇 알림 등)

다른 사이트에서 일이 생기면(예: 화이트보드에 포스트잇 추가) 채팅방에 📌 메시지와 알림을 보냅니다.

1. **SQL Editor**에서 `supabase/migrations/20261023000000_v3_integrations.sql` 실행 (한 번만)
2. **Edge Functions → push → Code**에서 `supabase/functions/push/index.ts` 최신 코드로 교체 → Deploy
3. `main`에 합쳐지면 웹사이트가 자동으로 배포됩니다.
4. 관리자 화면 → 방 목록의 **📌 연동** → **연동 키 발급**
   - **ChatGPT 요청문 복사** → 화이트보드를 만든 ChatGPT 대화에 붙여넣기 → ChatGPT가 수정한 화이트보드 배포
   - **이 방에 테스트 메시지 보내기**로 연결 확인
5. 화이트보드에 포스트잇을 추가해서 채팅방에 📌 메시지가 오는지 확인

> 🔐 연동 키는 화이트보드 사이트 코드 안에 들어갑니다. 키가 있으면 그 방에 📌 메시지를 보낼 수 있으므로(1분에 30건 제한), 유출이 의심되면 **해제** 후 새로 발급하세요. 연동 메시지는 사람 메시지와 구분되어 "연동" 표시가 붙습니다.

---

## v4 업데이트: 내 정보 수정 · 배경화면

1. **SQL Editor**에서 `supabase/migrations/20261024000000_v4_profile.sql` 실행 (한 번만)
2. `main`에 합쳐지면 웹사이트가 자동으로 배포됩니다. (push 함수는 바꾸지 않아도 됩니다)

- **👤 내 정보 수정**: 채팅방 ☰ → 내 정보 수정. 이름·소속이 **모든 채팅방과 지난 메시지에 바로** 적용되고, 채팅방에 변경 안내가 표시됩니다. 관리자 화면의 "내 표시 정보"도 같은 방식으로 바뀝니다.
- **🎨 배경화면**: 채팅방 ☰ → 배경화면. 색상·그라데이션·패턴·어두운 배경·내 사진 중에서 고릅니다. "이 방에만 적용"도 가능합니다. 이 PC에만 저장됩니다.

---

## v5 업데이트: 메시지 수정 · 전달 · 채팅방 알림 끄기, 휴대폰 길게 누르기 수정

1. **SQL Editor**에서 `supabase/migrations/20261025000000_v5_edit_forward.sql` 실행 (한 번만)
2. **Edge Functions → push → Code**에서 `supabase/functions/push/index.ts` 최신 코드로 교체 → **Deploy**
   (알림을 끈 사람·방에는 푸시를 보내지 않도록 바뀌었습니다)
3. `main`에 합쳐지면 웹사이트가 자동으로 배포됩니다.

- **✏️ 수정**: 내가 보낸 글 메시지, 보낸 지 24시간 이내. 수정하면 `수정됨` 표시
- **↪️ 전달**: 글·사진·파일·작업일보를 내가 참여한 다른 방(또는 같은 방)으로. `↪ 전달됨` 표시
- **🔔/🔕 채팅방 알림**: 채팅방 위쪽 종 버튼으로 나만 알림 끄기·켜기 (PC·휴대폰 공통 저장). 꺼도 안 읽은 숫자는 표시
- **관리자 방 알림**: 관리자 화면 방 목록의 **알림** 버튼으로 방 전체 알림 끄기·켜기
- 🚨 **긴급 메시지는 알림을 꺼도 항상 알림**이 갑니다 (안전 공지 누락 방지)
- 휴대폰에서 메시지를 **길게 누르면** 메뉴(답장·복사·전달·수정·삭제 등)가 뜹니다

---

## 회사 PC에서 확인할 것

- 회사 PC에서 `https://<주소>.pages.dev` 가 열리는지, 메시지가 실시간으로 오가는지 확인하세요.
  사내 방화벽이 `*.supabase.co` (특히 WebSocket 연결)를 막으면 메시지가 바로 오지 않습니다. 이때는 상단에 "연결이 끊겼습니다" 표시가 나옵니다.
- 업무 대화와 사진이 외부 클라우드(Supabase 서울 리전)에 저장됩니다. 기밀 자료가 오갈 수 있다면 보안 담당자와 미리 협의하세요.

## 무료 한도 (Supabase Free)

| 항목 | 한도 | 참고 |
|---|---|---|
| DB | 500 MB | 텍스트 메시지 수백만 건 수준 |
| 사진 저장 | 1 GB | 사진 1장 약 0.2~0.5 MB → 2,000~5,000장. 90일 자동 삭제로 관리 |
| 전송량 | 5 GB / 월 | 사진 열람이 많으면 이 한도에 먼저 닿을 수 있음 |
| 동시 접속 | 200명 | |
| 일시정지 | 7일 비활성 시 | 7단계의 매일 정리 작업이 막아줌 |

사용량은 Supabase 대시보드의 **Usage** 메뉴에서 확인할 수 있습니다.

## 자주 묻는 질문

**Q. 참여자가 브라우저 기록을 지우면?**
다시 입장코드를 입력하면 됩니다. 이전 대화도 그대로 보입니다. 다만 새 참여자로 등록되어 참여자 목록에 같은 이름이 한 번 더 보일 수 있습니다.

**Q. 파일(PDF·엑셀)도 90일 뒤 지워지나요?**
네. 무료 용량(1GB)을 지키기 위해 사진과 같은 90일 규칙입니다. 오래 보관해야 하는 도면 등은 따로 저장해 두세요. 기간은 `.github/workflows/cleanup-images.yml`의 `RETENTION_DAYS`로 바꿀 수 있습니다.

**Q. 코드가 유출되면?**
코드를 아는 사람은 누구나 들어올 수 있으니, 참여자 목록을 확인하세요. (강퇴와 코드 재발급은 다음 버전 후보입니다.)

**Q. 코드를 무작위로 넣어 보면 뚫리지 않나?**
코드는 31종 문자 × 8자리(약 8,500억 가지)입니다. 10분에 10번 이상 틀리면 차단됩니다.
