-- =====================================================================
--  협력사 소통방 v8 - 🚨 긴급·중요 메시지 "확인" 받기
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (v7 SQL 을 먼저 실행한 상태여야 합니다. 이 파일은 여러 번 실행해도 됩니다)
--
--  긴급 메시지를 받은 사람 화면은 빨갛게 깜빡이고(휴대폰은 진동),
--  "확인"을 눌러야 사라집니다. 보낸 사람은 누가 확인했는지 보고, 안 본 사람에게 다시 알릴 수 있습니다.
-- =====================================================================

-- 확인이 필요한 메시지 (이 기능 이후의 긴급 메시지만. 예전 긴급 메시지가 한꺼번에 뜨지 않도록)
alter table public.messages add column if not exists needs_ack boolean not null default false;
-- 다시 알림 보낸 시각 (너무 자주 못 보내도록)
alter table public.messages add column if not exists last_remind_at timestamptz;

create or replace function public.messages_set_needs_ack()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.needs_ack := coalesce(new.is_urgent, false) and new.user_id is not null and new.kind not in ('system', 'bot');
  new.last_remind_at := null;
  return new;
end $$;

drop trigger if exists messages_set_needs_ack on public.messages;
create trigger messages_set_needs_ack
  before insert on public.messages
  for each row execute function public.messages_set_needs_ack();

-- 누가 확인했는지 (사람 번호 기준: PC·휴대폰 중 한 곳에서 확인하면 모두 확인)
create table if not exists public.urgent_acks (
  message_id bigint not null references public.messages (id) on delete cascade,
  person_id  uuid not null,
  acked_at   timestamptz not null default now(),
  primary key (message_id, person_id)
);
alter table public.urgent_acks enable row level security;
drop policy if exists "urgent_acks: room members read" on public.urgent_acks;
create policy "urgent_acks: room members read" on public.urgent_acks
  for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and (public.is_member(m.room_id) or public.is_admin())));

-- 실시간: 보낸 사람 화면에 확인 숫자가 바로 바뀌도록
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'urgent_acks'
  ) then
    alter publication supabase_realtime add table public.urgent_acks;
  end if;
end $$;

-- 이 사람이 이 메시지를 확인했는지 (묶기 전에 다른 기기에서 확인한 것도 인정)
create or replace function public.has_acked(p_message_id bigint, p_person uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from urgent_acks a
    where a.message_id = p_message_id and (a.person_id = p_person or public.person_of(a.person_id) = p_person)
  );
$$;

-- 확인 누르기
create or replace function public.ack_urgent(p_message_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_msg    messages;
  v_person uuid := public.my_person();
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  select * into v_msg from messages where id = p_message_id;
  if not found or not v_msg.needs_ack or not public.is_member(v_msg.room_id) then
    return false;
  end if;
  insert into urgent_acks (message_id, person_id) values (p_message_id, v_person)
  on conflict do nothing;
  return true;
end $$;

-- 내가 아직 확인하지 않은 긴급 메시지 (모든 방, 최근 7일)
create or replace function public.my_pending_urgent()
returns table (
  id             bigint,
  room_id        uuid,
  room_name      text,
  sender_name    text,
  sender_company text,
  kind           text,
  body           text,
  file_name      text,
  created_at     timestamptz
) language sql stable security definer set search_path = public as $$
  select m.id, m.room_id, r.name, m.sender_name, m.sender_company, m.kind, m.body, m.file_name, m.created_at
  from messages m
  join rooms r on r.id = m.room_id
  join room_members me on me.room_id = m.room_id and me.user_id = auth.uid()
  where m.needs_ack
    and m.deleted_at is null
    and m.created_at > now() - interval '7 days'
    and m.sender_person is distinct from me.person_id
    and m.created_at >= (select min(x.joined_at) from room_members x where x.room_id = m.room_id and x.person_id = me.person_id)
    and not public.has_acked(m.id, me.person_id)
  order by m.id;
$$;

-- 다시 알림 (push 함수가 부름): 보낸 사람이나 관리자만, 1분에 한 번. 아직 확인 안 한 사람의 기기 목록을 돌려줌
create or replace function public.claim_urgent_remind(p_message_id bigint, p_user uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare
  v_msg messages;
begin
  select * into v_msg from messages where id = p_message_id;
  if not found or not v_msg.needs_ack or v_msg.deleted_at is not null then
    raise exception 'NOT_URGENT';
  end if;
  if v_msg.sender_person is distinct from public.person_of(p_user)
     and not exists (select 1 from admins a where public.person_of(a.user_id) = public.person_of(p_user)) then
    raise exception 'NOT_ALLOWED';
  end if;
  update messages set last_remind_at = now()
  where id = p_message_id and (last_remind_at is null or last_remind_at < now() - interval '1 minute');
  if not found then
    raise exception 'TOO_SOON';
  end if;

  return query
  select rm.user_id from room_members rm
  where rm.room_id = v_msg.room_id
    and rm.person_id is distinct from v_msg.sender_person
    and (select min(x.joined_at) from room_members x where x.room_id = rm.room_id and x.person_id = rm.person_id) <= v_msg.created_at
    and not public.has_acked(v_msg.id, rm.person_id);
end $$;

revoke execute on function public.ack_urgent(bigint) from public, anon;
revoke execute on function public.my_pending_urgent() from public, anon;
revoke execute on function public.has_acked(bigint, uuid) from public, anon;
revoke execute on function public.claim_urgent_remind(bigint, uuid) from public, anon, authenticated;
