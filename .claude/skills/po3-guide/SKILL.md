---
name: po3-guide
description: 협력사 소통방(po3) 저장소에서 작업할 때의 사용자 안내 규칙과 배포(반영) 절차. 이 저장소에서 기능을 만들거나 고칠 때, 진행 상황을 알릴 때, 사용자에게 Supabase·GitHub·Cloudflare 반영 방법을 안내할 때 항상 먼저 읽는다.
---

# 협력사 소통방(po3) 작업 · 안내 규칙

## 1. 언어: 모든 출력은 한국어
- **최종 답변뿐 아니라 도구 호출 사이의 진행 설명까지 전부 한국어로** 쓴다. ("Now testing…", "Let me check…" 같은 영어 문장 금지)
- 표, 요약, 오류 설명, 테스트 결과 보고도 한국어로 쓴다.
- 코드 주석과 화면 문구는 한국어로 쓴다. git 커밋 메시지는 영어로 써도 되지만, PR 제목과 본문은 한국어로 쓴다.

## 2. 안내 방식 (사용자는 비개발자 현장 관리자)
- 지시마다 **"왜?"를 한 줄** 붙인다. (예: "왜? 이 키가 있어야 서버가 어느 방으로 보낼지 압니다")
- 단계를 번호로 나누고, 누를 버튼 이름을 **굵게** 쓰고, 열어야 할 **링크를 직접** 준다.
- 화면이 다르거나 막히면 "캡쳐해서 보내주세요"라고 안내한다.
- 비밀값(Secret key, service_role 키, DB 비밀번호)은 채팅에 붙여넣지 말라고 안내한다.
- 사용자가 캡쳐를 보내면 먼저 무엇이 보이는지 해석하고("오류처럼 보이지만 성공입니다" 등), 그다음 할 일을 말한다.

## 3. 반영(배포) 절차 안내 템플릿
변경 내용에 따라 필요한 단계만 골라 **이 순서대로** 안내한다. 순서가 중요하다. DB(SQL)를 먼저 바꾸고 Merge해야 한다.

1. **SQL 실행** (`supabase/migrations/`에 새 파일이 생긴 경우)
   - SQL 파일: `https://github.com/poscoencpo3-ui/po3/blob/<브랜치>/supabase/migrations/<파일명>` → 📋 복사
   - SQL Editor: https://supabase.com/dashboard/project/hilywrpgdpyxdclboyze/sql/new → 붙여넣기 → **Run**
   - `Success. No rows returned`이면 성공. `already exists`는 이미 실행된 것이라 무시해도 된다.
2. **push 함수 교체** (`supabase/functions/push/index.ts`가 바뀐 경우)
   - 코드: `https://github.com/poscoencpo3-ui/po3/blob/<브랜치>/supabase/functions/push/index.ts` → 📋 복사
   - https://supabase.com/dashboard/project/hilywrpgdpyxdclboyze/functions → **push** → **Code** 탭 → 전부 지우고 붙여넣기 → **Deploy**
   - JWT 검증 끄기 설정은 유지된다. 다시 끌 필요가 없다.
3. **PR Merge** → Cloudflare Pages가 1~2분 안에 자동 배포
4. **새 버전 받기**: PC는 `Ctrl + Shift + R`. 휴대폰 홈 화면 앱은 완전히 닫았다가 다시 열고, 그래도 예전 화면이면 아래로 당겨 새로고침
5. **확인 표**: 무엇을, 어떻게 눌러서, 어떤 결과가 나오면 성공인지 표로 정리

각 단계에서 "이번에는 ○○는 안 바꿔도 됩니다"(예: push 함수 변경 없음)를 꼭 함께 알린다.

## 4. 작업 흐름
- 같은 PR이 아직 Merge되지 않았고 사용자가 SQL도 아직 실행하지 않았다면, 새 SQL을 **기존 미실행 파일에 합쳐서** 사용자 단계를 줄인다. 이미 실행한 SQL 파일은 절대 수정하지 않고 새 파일을 만든다.
- PR이 Merge된 뒤의 후속 작업은 작업 브랜치를 최신 `main`에서 다시 시작한다.
- 완료라고 말하기 전에 로컬 Supabase(Docker)와 Playwright로 실제 화면을 테스트하고, 기존 시나리오 회귀 테스트도 다시 돌린다. 테스트를 못 한 부분(실제 휴대폰, 회사망 등)은 솔직하게 "확인하지 못함"이라고 쓴다.
- 휴대폰 동작은 `isMobile/hasTouch`와 CDP `Input.dispatchTouchEvent`(실제 손가락처럼 누름·흔들림·뗌)로 확인한다.

## 5. 프로젝트 정보
- 사이트: https://po3-talk.pages.dev (관리자: `#/admin`)
- Supabase 프로젝트: `hilywrpgdpyxdclboyze` (서울 리전, 무료 플랜)
- 저장소: `poscoencpo3-ui/po3`, 배포: Cloudflare Pages (`main` 브랜치)
- Edge Function: `push` 하나 (푸시 알림, 알림 테스트, 외부 연동 수신). JWT 검증 OFF, 로그인은 함수 안에서 확인
- 회사 PC는 회사망이 마이크로소프트 푸시(WNS)를 막는다. 사이트가 열려 있으면(최소화 포함) 4초 대체 알림으로 동작하고, 탭을 닫으면 알림이 오지 않는다.
- 사용자 PC는 Edge 사용. 회사 정책으로 일부 설정은 "조직에서 관리"된다.
