-- 봄별 피아노 달리기 랭킹 (Supabase SQL Editor에 붙여넣고 Run, 한 번만)
-- 슬라임 게임·채팅사이트와 같은 프로젝트에 넣어도 서로 영향이 없습니다.

create table if not exists public.piano_scores (
  id bigint generated always as identity primary key,
  song text not null check (song ~ '^[a-z]{2,20}$'),
  name text not null check (char_length(name) between 1 and 8),
  avatar text not null default 'bunny' check (char_length(avatar) <= 16),
  score integer not null check (score between 0 and 200000),
  max_combo integer not null default 0 check (max_combo between 0 and 2000),
  grade text not null default 'C' check (grade in ('S', 'A', 'B', 'C', 'D')),
  perfect integer not null default 0 check (perfect between 0 and 2000),
  good integer not null default 0 check (good between 0 and 2000),
  bad integer not null default 0 check (bad between 0 and 2000),
  miss integer not null default 0 check (miss between 0 and 2000),
  mode text not null default 'solo' check (mode in ('solo', 'race')),
  created_at timestamptz not null default now()
);

create index if not exists piano_scores_song_score on public.piano_scores (song, score desc);

alter table public.piano_scores enable row level security;

-- 누구나 랭킹을 보고, 기록을 추가할 수 있음 (수정·삭제는 불가)
drop policy if exists "piano read" on public.piano_scores;
create policy "piano read" on public.piano_scores for select to anon, authenticated using (true);
drop policy if exists "piano insert" on public.piano_scores;
create policy "piano insert" on public.piano_scores for insert to anon, authenticated with check (true);

grant select, insert on public.piano_scores to anon, authenticated;

-- 누적 점수 랭킹
create or replace view public.piano_points
with (security_invoker = true) as
select
  name,
  (array_agg(avatar order by created_at desc))[1] as avatar,
  sum(score)::int as total,
  count(*)::int as plays
from public.piano_scores
group by name;

grant select on public.piano_points to anon, authenticated;
