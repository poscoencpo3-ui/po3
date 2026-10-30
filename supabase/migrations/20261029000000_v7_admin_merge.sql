-- =====================================================================
--  협력사 소통방 v7 - 관리자 동일인 묶기 / 묶음 풀기 / 직원 파일 전송 제한
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (v6 SQL 을 먼저 실행한 상태여야 합니다. 이 파일은 여러 번 실행해도 됩니다)
--
--  1) 기기 연결 코드를 쓰지 않은 사람도, 관리자가 참여자 목록에서 골라 한 사람으로 합칩니다.
--     잘못 묶었으면 묶음을 풀 수 있고, 묶으면서 생긴 방은 다시 빠집니다.
--  2) 관리자가 '파일 금지'로 지정한 사람은, '파일 제한'을 켠 방에서 사진·캡쳐만 올릴 수 있습니다.
-- =====================================================================

-- 다른 기기 덕분에 생긴 방 참여 기록 (묶음을 풀면 지움)
alter table public.room_members add column if not exists via_link boolean not null default false;

-- 파일 금지로 지정된 사람 (사람 번호 기준: PC·휴대폰 모두)
create table if not exists public.file_blocked_people (
  person_id  uuid primary key,
  blocked_at timestamptz not null default now(),
  blocked_by uuid
);
alter table public.file_blocked_people enable row level security;
drop policy if exists "file_blocked_people: admins read" on public.file_blocked_people;
create policy "file_blocked_people: admins read" on public.file_blocked_people
  for select to authenticated using (public.is_admin());

-- 방마다 파일 제한 켜기/끄기
alter table public.rooms add column if not exists restrict_files boolean not null default false;

-- ---------------------------------------------------------------------
-- 두 사람을 하나로 합치는 공통 부분 (기기 연결 코드 / 관리자 묶기)
-- ---------------------------------------------------------------------
create or replace function public.merge_person(p_old uuid, p_target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_name    text;
  v_company text;
begin
  if p_old = p_target then
    return null;
  end if;

  -- 기기 묶기
  insert into device_links (user_id, person_id)
  select d, p_target from public.devices_of(p_old) d
  on conflict (user_id) do update set person_id = excluded.person_id, linked_at = now();
  update device_links set person_id = p_target where person_id = p_old;

  -- 대표(코드 주인) 쪽 이름·소속으로 통일
  select display_name, company into v_name, v_company
  from room_members where person_id = p_target order by joined_at desc limit 1;
  if v_name is null then
    select display_name, company into v_name, v_company
    from room_members where person_id = p_old order by joined_at desc limit 1;
  end if;

  update room_members set person_id = p_target where person_id = p_old;
  if v_name is not null then
    update room_members set display_name = v_name, company = v_company
    where person_id = p_target and (display_name is distinct from v_name or company is distinct from v_company);
  end if;

  -- 둘 중 한쪽이라도 파일 금지였으면 합친 사람도 파일 금지
  insert into file_blocked_people (person_id, blocked_by)
  select p_target, blocked_by from file_blocked_people where person_id = p_old
  on conflict (person_id) do nothing;
  delete from file_blocked_people where person_id = p_old;

  -- 모든 기기가 같은 방 목록을 갖도록 (한쪽에서만 들어간 방도 함께)
  insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, joined_at, person_id, muted, via_link)
  select r.room_id, d.user_id, coalesce(v_name, r.display_name), coalesce(v_company, r.company),
         r.is_admin, r.last_read_id, r.joined_at, p_target, r.muted, true
  from (
    select room_id, max(last_read_id) as last_read_id, min(joined_at) as joined_at,
           bool_or(muted) as muted, bool_or(is_admin) as is_admin,
           min(display_name) as display_name, min(company) as company
    from room_members where person_id = p_target group by room_id
  ) r
  cross join (select public.devices_of(p_target) as user_id) d
  where not exists (select 1 from room_members x where x.room_id = r.room_id and x.user_id = d.user_id);

  -- 읽은 위치·알림 설정 맞추기
  update room_members m set last_read_id = r.last_read_id, muted = r.muted
  from (
    select room_id, max(last_read_id) as last_read_id, bool_or(muted) as muted
    from room_members where person_id = p_target group by room_id
  ) r
  where m.person_id = p_target and m.room_id = r.room_id
    and (m.last_read_id <> r.last_read_id or m.muted <> r.muted);

  -- 지난 메시지도 같은 사람으로 (바뀌는 것만: 한꺼번에 많이 바뀌면 실시간 전송 한도에 걸림)
  update messages set sender_person = p_target,
    sender_name = coalesce(v_name, sender_name), sender_company = coalesce(v_company, sender_company)
  where user_id in (select public.devices_of(p_target)) and kind not in ('system', 'bot')
    and (sender_person is distinct from p_target
         or sender_name is distinct from coalesce(v_name, sender_name)
         or sender_company is distinct from coalesce(v_company, sender_company));

  return v_name;
end $$;

-- 기기 연결 코드: 합치는 부분을 공통 함수로
create or replace function public.link_device(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code   text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_link   link_codes;
  v_old    uuid := public.my_person();
  v_target uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  if (select count(*) from join_failures
      where user_id = auth.uid() and at > now() - interval '10 minutes') >= 10 then
    raise exception 'TOO_MANY_ATTEMPTS';
  end if;

  select * into v_link from link_codes where code = v_code and used_at is null and expires_at > now();
  if not found then
    insert into join_failures (user_id) values (auth.uid());
    return null;
  end if;
  v_target := v_link.person_id;
  update link_codes set used_at = now() where code = v_code;
  if v_target = v_old then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- 관리자 계정은 다른 사람 쪽으로 합칠 수 없음 (관리자 기기가 코드를 만들어야 함)
  if exists (select 1 from admins where public.person_of(user_id) = v_old)
     and not exists (select 1 from admins where public.person_of(user_id) = v_target) then
    raise exception 'ADMIN_MUST_CREATE_CODE';
  end if;

  return jsonb_build_object('ok', true, 'name', public.merge_person(v_old, v_target));
end $$;

-- 입장: 내 다른 기기에도 함께 생기는 방 기록은 via_link 로 표시 (묶음을 풀면 빠지도록)
create or replace function public.join_room(p_code text, p_name text, p_company text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_code    text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_name    text := btrim(coalesce(p_name, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_person  uuid := public.my_person();
  v_room    uuid;
  v_mine    room_members;
  v_label   text;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  if v_name = '' then
    raise exception 'NAME_REQUIRED';
  end if;

  if (select count(*) from join_failures
      where user_id = auth.uid() and at > now() - interval '10 minutes') >= 10 then
    raise exception 'TOO_MANY_ATTEMPTS';
  end if;

  select id into v_room from rooms where code = v_code;
  if v_room is null then
    insert into join_failures (user_id) values (auth.uid());
    return null;
  end if;

  if exists (select 1 from room_members where room_id = v_room and user_id = auth.uid()) then
    -- 다른 기기 덕분에 있던 방이라도, 이 기기에서 직접 코드로 들어오면 이 기기의 방
    update room_members set via_link = false where room_id = v_room and user_id = auth.uid() and via_link;
    return v_room;
  end if;

  select * into v_mine from room_members where room_id = v_room and person_id = v_person limit 1;
  if found then
    insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, joined_at, person_id, muted)
    values (v_room, auth.uid(), v_mine.display_name, v_mine.company, v_mine.is_admin, v_mine.last_read_id,
            v_mine.joined_at, v_person, v_mine.muted);
    return v_room;
  end if;

  insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, person_id, via_link)
  select v_room, d, v_name, v_company, public.is_admin(),
         coalesce((select max(id) from messages where room_id = v_room), 0), v_person, d <> auth.uid()
  from public.devices_of(v_person) d
  on conflict do nothing;

  v_label := v_name || case when v_company <> '' then ' (' || v_company || ')' else '' end;
  insert into messages (room_id, user_id, kind, body)
  values (v_room, null, 'system', v_label || '님이 들어왔습니다.');

  return v_room;
end $$;

-- ---------------------------------------------------------------------
-- 관리자: 동일인 묶기
--   p_target: 대표로 보일 사람, p_others: 대표에 합칠 사람들 (모두 사람 번호 person_id)
-- ---------------------------------------------------------------------
create or replace function public.admin_merge_people(p_target uuid, p_others uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_others uuid[];
  v_other  uuid;
  v_admins int;
  v_name   text;
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_others
  from unnest(coalesce(p_others, '{}')) x where x is not null and x <> p_target;
  if cardinality(v_others) = 0 then
    raise exception 'NOTHING_TO_MERGE';
  end if;

  if exists (
    select 1 from unnest(v_others || p_target) x
    where not exists (select 1 from room_members m where m.person_id = x)
  ) then
    raise exception 'UNKNOWN_PERSON';
  end if;

  -- 관리자는 대표로만 (관리자 계정이 다른 사람 밑으로 들어가면 관리자 기능이 꼬임)
  select count(*) into v_admins from unnest(v_others || p_target) x
  where exists (select 1 from admins a where public.person_of(a.user_id) = x);
  if v_admins > 1 then
    raise exception 'TWO_ADMINS';
  end if;
  if v_admins = 1 and not exists (select 1 from admins a where public.person_of(a.user_id) = p_target) then
    raise exception 'ADMIN_MUST_BE_TARGET';
  end if;

  foreach v_other in array v_others loop
    v_name := public.merge_person(v_other, p_target);
  end loop;

  return jsonb_build_object('ok', true, 'name', v_name, 'merged', cardinality(v_others));
end $$;

-- ---------------------------------------------------------------------
-- 관리자: 묶음 풀기 (한 사람으로 묶인 기기들을 다시 각자 따로)
--   묶으면서 다른 기기 덕분에 생긴 방(via_link)은 지움
-- ---------------------------------------------------------------------
create or replace function public.admin_split_person(p_person uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_devices uuid[];
  v_dev     uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;

  select coalesce(array_agg(user_id), '{}') into v_devices from device_links where person_id = p_person;
  if cardinality(v_devices) = 0 then
    return 0;
  end if;

  delete from device_links where person_id = p_person;
  -- 파일 금지였으면 나뉜 기기들도 모두 파일 금지
  insert into file_blocked_people (person_id, blocked_by)
  select d, b.blocked_by from unnest(v_devices) d
  cross join (select blocked_by from file_blocked_people where person_id = p_person) b
  on conflict (person_id) do nothing;
  foreach v_dev in array v_devices loop
    update room_members set person_id = v_dev where user_id = v_dev;
    update messages set sender_person = v_dev
    where user_id = v_dev and kind not in ('system', 'bot') and sender_person is distinct from v_dev;
  end loop;

  -- 묶음 때문에 생긴 방 기록은 지움 (직접 코드로 들어간 방만 남음)
  delete from room_members where via_link and user_id = any (v_devices || p_person);

  return cardinality(v_devices);
end $$;

-- ---------------------------------------------------------------------
-- 직원 파일 전송 제한
-- ---------------------------------------------------------------------

-- 이 기기(사용자)가 이 방에 문서 파일을 올릴 수 없는지: 방이 파일 제한이고, 그 사람이 파일 금지
create or replace function public.files_blocked(p_room uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select restrict_files from rooms where id = p_room), false)
     and exists (select 1 from file_blocked_people where person_id = public.person_of(p_user));
$$;

-- 저장소 경로(방번호/파일)로 확인
create or replace function public.files_blocked_in_folder(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rooms r
    where r.id::text = split_part(p_name, '/', 1) and public.files_blocked(r.id, auth.uid())
  );
$$;

-- 파일 메시지(📎, 전달 포함)는 서버에서도 막음. 사진(image)은 그대로 허용
create or replace function public.messages_guard_files()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'file' and new.user_id is not null and public.files_blocked(new.room_id, new.user_id) then
    raise exception 'FILES_BLOCKED';
  end if;
  return new;
end $$;

drop trigger if exists messages_guard_files on public.messages;
create trigger messages_guard_files
  before insert on public.messages
  for each row execute function public.messages_guard_files();

-- 파일 저장소 올리기: 파일 금지인 사람은 제한된 방 폴더에 못 올림 (전달할 때 복사도 포함)
drop policy if exists "chat-files: members upload" on storage.objects;
create policy "chat-files: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-files' and public.is_member_of_folder(name) and not public.files_blocked_in_folder(name));

-- 관리자: 방 파일 제한 켜기/끄기
create or replace function public.set_room_restrict_files(p_room uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  update rooms set restrict_files = coalesce(p_on, false)
  where id = p_room and restrict_files is distinct from coalesce(p_on, false);
end $$;

-- 관리자: 사람별 파일 금지 지정/해제
create or replace function public.admin_set_files_blocked(p_person uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  if coalesce(p_blocked, false) then
    insert into file_blocked_people (person_id, blocked_by) values (p_person, auth.uid())
    on conflict (person_id) do nothing;
  else
    delete from file_blocked_people where person_id = p_person;
  end if;
end $$;

-- 방 목록에 "이 방에서 내가 파일을 못 보냄" 추가
drop function if exists public.my_rooms();
create function public.my_rooms()
returns table (
  room_id               uuid,
  name                  text,
  code                  text,
  member_count          int,
  unread                int,
  last_kind             text,
  last_body             text,
  last_sender           text,
  last_urgent           boolean,
  last_deleted          boolean,
  last_at               timestamptz,
  muted                 boolean,
  notifications_enabled boolean,
  restrict_files        boolean,
  files_blocked         boolean
) language sql stable security definer set search_path = public as $$
  select
    r.id, r.name, r.code,
    (select count(distinct x.person_id)::int from room_members x where x.room_id = r.id),
    (select count(*)::int from messages x
      where x.room_id = r.id and x.id > m.last_read_id
        and x.kind <> 'system' and x.sender_person is distinct from m.person_id),
    lm.kind, lm.body, lm.sender_name, lm.is_urgent, lm.deleted_at is not null,
    coalesce(lm.created_at, r.created_at),
    m.muted, r.notifications_enabled, r.restrict_files,
    r.restrict_files and exists (select 1 from file_blocked_people b where b.person_id = m.person_id)
  from room_members m
  join rooms r on r.id = m.room_id
  left join lateral (
    select kind, body, sender_name, is_urgent, deleted_at, created_at from messages
    where room_id = r.id order by id desc limit 1
  ) lm on true
  where m.user_id = auth.uid()
  order by coalesce(lm.created_at, r.created_at) desc;
$$;

revoke execute on function public.my_rooms() from public, anon;
revoke execute on function public.files_blocked(uuid, uuid) from public, anon;
revoke execute on function public.set_room_restrict_files(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_files_blocked(uuid, boolean) from public, anon;
revoke execute on function public.merge_person(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.link_device(text) from public, anon;
revoke execute on function public.admin_merge_people(uuid, uuid[]) from public, anon;
revoke execute on function public.admin_split_person(uuid) from public, anon;
