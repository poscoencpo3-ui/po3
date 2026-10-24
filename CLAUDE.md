# CLAUDE.md

## 가장 중요한 규칙
- **모든 출력은 한국어로 한다.** 최종 답변뿐 아니라 도구 호출 사이의 진행 설명까지 전부 한국어로 쓴다.
- 작업을 시작하기 전에 `.claude/skills/po3-guide/SKILL.md`를 읽고 그 안내 규칙과 배포 절차를 따른다.

## 프로젝트
협력사 소통방: 카카오톡 PC판을 설치할 수 없는 환경을 위한 코드 입장형 웹 메신저입니다.
- 프론트엔드: React + Vite (`src/`)
- 백엔드: Supabase (`supabase/migrations/` SQL, `supabase/functions/push/` Edge Function)
- 설치와 배포 안내: `docs/SETUP.md`
