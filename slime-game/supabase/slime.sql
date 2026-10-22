-- 슬라임 게임 랭킹 (Supabase SQL Editor에 붙여넣고 Run, 한 번만)
-- 채팅사이트와 같은 Supabase 프로젝트에 넣어도 서로 영향이 없습니다.

create table if not exists public.slime_runs (
  id bigint generated always as identity primary key,
  map text not null check (map in ('saebom', 'saebyeol')),
  name text not null check (char_length(name) between 1 and 8),
  avatar text not null default 'bunny' check (char_length(avatar) <= 16),
  time_ms integer not null check (time_ms between 1000 and 3600000),
  points integer not null check (points between 0 and 5000),
  mode text not null default 'solo' check (mode in ('solo', 'race')),
  created_at timestamptz not null default now()
);

create index if not exists slime_runs_map_time on public.slime_runs (map, time_ms);

alter table public.slime_runs enable row level security;

-- 누구나 랭킹을 보고, 기록을 추가할 수 있음 (수정·삭제는 불가)
drop policy if exists "slime read" on public.slime_runs;
create policy "slime read" on public.slime_runs for select to anon, authenticated using (true);
drop policy if exists "slime insert" on public.slime_runs;
create policy "slime insert" on public.slime_runs for insert to anon, authenticated with check (true);

grant select, insert on public.slime_runs to anon, authenticated;

-- 누적 점수 랭킹
create or replace view public.slime_points
with (security_invoker = true) as
select
  name,
  (array_agg(avatar order by created_at desc))[1] as avatar,
  sum(points)::int as total,
  count(*)::int as plays
from public.slime_runs
group by name;

grant select on public.slime_points to anon, authenticated;
