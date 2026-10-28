-- =====================================================================
--  협력사 소통방 v7 - 관리자가 동일인 묶기 / 묶음 풀기
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (v6 SQL 을 먼저 실행한 상태여야 합니다)
--
--  기기 연결 코드를 쓰지 않은 사람도, 관리자가 참여자 목록에서 골라 한 사람으로 합칩니다.
--  잘못 묶었으면 묶음을 풀 수 있고, 묶으면서 생긴 방은 다시 빠집니다.
-- =====================================================================

-- 다른 기기 덕분에 생긴 방 참여 기록 (묶음을 풀면 지움)
alter table public.room_members add column if not exists via_link boolean not null default false;

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
  foreach v_dev in array v_devices loop
    update room_members set person_id = v_dev where user_id = v_dev;
    update messages set sender_person = v_dev
    where user_id = v_dev and kind not in ('system', 'bot') and sender_person is distinct from v_dev;
  end loop;

  -- 묶음 때문에 생긴 방 기록은 지움 (직접 코드로 들어간 방만 남음)
  delete from room_members where via_link and user_id = any (v_devices || p_person);

  return cardinality(v_devices);
end $$;

revoke execute on function public.merge_person(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.link_device(text) from public, anon;
revoke execute on function public.admin_merge_people(uuid, uuid[]) from public, anon;
revoke execute on function public.admin_split_person(uuid) from public, anon;
