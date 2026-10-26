-- =====================================================================
--  협력사 소통방 v6 - 기기 연결 (PC·휴대폰을 같은 사람으로 묶기)
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (v5 SQL 을 먼저 실행한 상태여야 합니다)
--
--  기기마다 로그인(user_id)은 따로지만, 같은 사람의 기기는 같은 person_id 를 가집니다.
--  참여자 목록·읽음 숫자·알림 설정·방 목록은 사람(person_id) 기준으로 처리합니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 사람 ↔ 기기
-- ---------------------------------------------------------------------

-- 연결된 기기만 기록. 기록이 없으면 그 기기 자신이 한 사람 (person_id = user_id)
create table public.device_links (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  person_id uuid not null,
  linked_at timestamptz not null default now()
);
create index device_links_person_idx on public.device_links (person_id);
alter table public.device_links enable row level security;

create or replace function public.person_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce((select person_id from device_links where user_id = p_user), p_user);
$$;

create or replace function public.my_person()
returns uuid language sql stable security definer set search_path = public as $$
  select public.person_of(auth.uid());
$$;

-- 이 사람의 모든 기기
create or replace function public.devices_of(p_person uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select p_person where exists (select 1 from auth.users where id = p_person)
  union
  select user_id from device_links where person_id = p_person;
$$;

-- 방 참여 기록에 사람 번호
alter table public.room_members add column person_id uuid;
update public.room_members set person_id = public.person_of(user_id);
alter table public.room_members alter column person_id set not null;
create index room_members_person_idx on public.room_members (person_id);

create or replace function public.room_members_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.person_id is null then
    new.person_id := public.person_of(new.user_id);
  end if;
  return new;
end $$;

create trigger room_members_before_insert
  before insert on public.room_members
  for each row execute function public.room_members_before_insert();

-- 메시지에 보낸 사람 번호 (다른 기기에서 보낸 내 메시지도 "내 메시지"로 보이도록)
alter table public.messages add column sender_person uuid;
update public.messages set sender_person = public.person_of(user_id) where user_id is not null;

create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reply messages;
begin
  new.created_at := now();
  new.image_expired := false;
  new.deleted_at := null;
  new.deleted_by := null;
  new.pushed_at := null;
  new.reply_snapshot := null;
  new.edited_at := null;
  new.sender_person := case when new.user_id is null then null else public.person_of(new.user_id) end;
  if new.kind not in ('system', 'bot') then
    select display_name, company into new.sender_name, new.sender_company
    from room_members where room_id = new.room_id and user_id = new.user_id;
  end if;
  if new.reply_to is not null then
    select * into v_reply from messages where id = new.reply_to and room_id = new.room_id;
    if found and v_reply.deleted_at is null then
      new.reply_snapshot := jsonb_build_object(
        'sender_name', v_reply.sender_name,
        'kind', v_reply.kind,
        'body', left(v_reply.body, 120)
      );
    else
      new.reply_to := null;
    end if;
  end if;
  return new;
end $$;

-- 관리자: 연결된 기기에서도 관리자 (관리자 기기가 만든 연결 코드로만 연결 가능)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where user_id = auth.uid() or public.person_of(user_id) = public.person_of(auth.uid())
  );
$$;

create or replace function public.my_admin()
returns setof public.admins language sql stable security definer set search_path = public as $$
  select * from admins
  where user_id = auth.uid() or public.person_of(user_id) = public.person_of(auth.uid())
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 연결 코드: 이미 쓰는 기기에서 만들고(6자리, 10분), 새 기기에서 입력
-- ---------------------------------------------------------------------

create table public.link_codes (
  code       text primary key,
  person_id  uuid not null,
  created_by uuid not null,
  expires_at timestamptz not null,
  used_at    timestamptz
);
alter table public.link_codes enable row level security;

create or replace function public.create_link_code()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_code text;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  delete from link_codes where created_by = auth.uid() or expires_at < now() - interval '1 day';
  loop
    v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    begin
      insert into link_codes (code, person_id, created_by, expires_at)
      values (v_code, public.my_person(), auth.uid(), now() + interval '10 minutes');
      exit;
    exception when unique_violation then
      -- 겹치면 다시 생성
    end;
  end loop;
  return v_code;
end $$;

-- 이 기기(와 이 기기에 이미 묶인 기기들)를 코드 주인의 사람으로 합침
create or replace function public.link_device(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code    text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_link    link_codes;
  v_old     uuid := public.my_person();
  v_target  uuid;
  v_name    text;
  v_company text;
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

  -- 기기 묶기
  insert into device_links (user_id, person_id)
  select d, v_target from public.devices_of(v_old) d
  on conflict (user_id) do update set person_id = excluded.person_id, linked_at = now();
  update device_links set person_id = v_target where person_id = v_old;

  -- 코드 주인의 이름·소속으로 통일
  select display_name, company into v_name, v_company
  from room_members where person_id = v_target order by joined_at desc limit 1;
  if v_name is null then
    select display_name, company into v_name, v_company
    from room_members where person_id = v_old order by joined_at desc limit 1;
  end if;

  update room_members set person_id = v_target where person_id = v_old;
  if v_name is not null then
    update room_members set display_name = v_name, company = v_company
    where person_id = v_target and (display_name is distinct from v_name or company is distinct from v_company);
  end if;

  -- 모든 기기가 같은 방 목록을 갖도록 (한쪽에서만 들어간 방도 함께)
  insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, joined_at, person_id, muted)
  select r.room_id, d.user_id, coalesce(v_name, r.display_name), coalesce(v_company, r.company),
         r.is_admin, r.last_read_id, r.joined_at, v_target, r.muted
  from (
    select room_id, max(last_read_id) as last_read_id, min(joined_at) as joined_at,
           bool_or(muted) as muted, bool_or(is_admin) as is_admin,
           min(display_name) as display_name, min(company) as company
    from room_members where person_id = v_target group by room_id
  ) r
  cross join (select public.devices_of(v_target) as user_id) d
  where not exists (select 1 from room_members x where x.room_id = r.room_id and x.user_id = d.user_id);

  -- 읽은 위치·알림 설정 맞추기
  update room_members m set last_read_id = r.last_read_id, muted = r.muted
  from (
    select room_id, max(last_read_id) as last_read_id, bool_or(muted) as muted
    from room_members where person_id = v_target group by room_id
  ) r
  where m.person_id = v_target and m.room_id = r.room_id
    and (m.last_read_id <> r.last_read_id or m.muted <> r.muted);

  -- 지난 메시지도 같은 사람으로 (바뀌는 것만: 한꺼번에 많이 바뀌면 실시간 전송 한도에 걸림)
  update messages set sender_person = v_target,
    sender_name = coalesce(v_name, sender_name), sender_company = coalesce(v_company, sender_company)
  where user_id in (select public.devices_of(v_target)) and kind not in ('system', 'bot')
    and (sender_person is distinct from v_target
         or sender_name is distinct from coalesce(v_name, sender_name)
         or sender_company is distinct from coalesce(v_company, sender_company));

  return jsonb_build_object('ok', true, 'name', v_name);
end $$;

-- ---------------------------------------------------------------------
-- 사람 기준으로 바뀌는 기능들
-- ---------------------------------------------------------------------

-- 입장: 내 다른 기기가 이미 있는 방이면 조용히 이 기기만 추가, 새 방이면 내 모든 기기에 추가
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
    return v_room;
  end if;

  select * into v_mine from room_members where room_id = v_room and person_id = v_person limit 1;
  if found then
    insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, joined_at, person_id, muted)
    values (v_room, auth.uid(), v_mine.display_name, v_mine.company, v_mine.is_admin, v_mine.last_read_id,
            v_mine.joined_at, v_person, v_mine.muted);
    return v_room;
  end if;

  insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id, person_id)
  select v_room, d, v_name, v_company, public.is_admin(),
         coalesce((select max(id) from messages where room_id = v_room), 0), v_person
  from public.devices_of(v_person) d
  on conflict do nothing;

  v_label := v_name || case when v_company <> '' then ' (' || v_company || ')' else '' end;
  insert into messages (room_id, user_id, kind, body)
  values (v_room, null, 'system', v_label || '님이 들어왔습니다.');

  return v_room;
end $$;

-- 나가기: 내 모든 기기에서 나감
create or replace function public.leave_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select display_name into v_name from room_members
  where room_id = p_room and person_id = public.my_person() limit 1;
  delete from room_members where room_id = p_room and person_id = public.my_person();
  if v_name is not null then
    insert into messages (room_id, user_id, kind, body)
    values (p_room, null, 'system', v_name || '님이 나갔습니다.');
  end if;
end $$;

-- 읽음: 한 기기에서 읽으면 내 모든 기기가 읽음
create or replace function public.mark_read(p_room uuid, p_message_id bigint)
returns void language sql security definer set search_path = public as $$
  update room_members set last_read_id = p_message_id
  where room_id = p_room and person_id = public.my_person() and last_read_id < p_message_id;
$$;

create or replace function public.set_room_muted(p_room uuid, p_muted boolean)
returns void language sql security definer set search_path = public as $$
  update room_members set muted = coalesce(p_muted, false)
  where room_id = p_room and person_id = public.my_person();
$$;

create or replace function public.update_my_profile(p_name text, p_company text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_person  uuid := public.my_person();
  v_old     record;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  if char_length(v_name) not between 1 and 20 or char_length(v_company) > 30 then
    raise exception 'INVALID_PROFILE';
  end if;

  update admins set display_name = v_name, company = v_company where public.person_of(user_id) = v_person;

  for v_old in
    select room_id, min(display_name) as display_name, bool_or(display_name <> v_name or company <> v_company) as changed
    from room_members where person_id = v_person group by room_id
  loop
    if v_old.changed then
      update room_members set display_name = v_name, company = v_company
      where room_id = v_old.room_id and person_id = v_person;
      if v_old.display_name <> v_name then
        insert into messages (room_id, user_id, kind, body)
        values (v_old.room_id, null, 'system', v_old.display_name || '님이 이름을 ' || v_name || '(으)로 변경했습니다.');
      end if;
    end if;
  end loop;

  update messages set sender_name = v_name, sender_company = v_company
  where sender_person = v_person and kind not in ('system', 'bot')
    and (sender_name is distinct from v_name or sender_company is distinct from v_company);
end $$;

-- 삭제·수정: 내 다른 기기에서 보낸 메시지도 내 것
create or replace function public.delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v messages;
begin
  select * into v from messages where id = p_message_id;
  if not found or v.kind = 'system' or v.deleted_at is not null then
    return;
  end if;
  if not public.is_member(v.room_id)
     or (public.person_of(v.user_id) is distinct from public.my_person() and not public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  if v.image_path is not null and not v.image_expired then
    insert into storage_trash (bucket, path) values ('chat-images', v.image_path);
  end if;
  if v.file_path is not null and not v.image_expired then
    insert into storage_trash (bucket, path) values ('chat-files', v.file_path);
  end if;

  update messages set
    deleted_at = now(), deleted_by = auth.uid(),
    body = '', data = null, image_path = null, file_path = null, file_name = null,
    mentions = '{}', reply_snapshot = null
  where id = p_message_id;

  update messages set reply_snapshot = jsonb_build_object('deleted', true)
  where reply_to = p_message_id;

  update rooms set notice_message_id = null where notice_message_id = p_message_id;
end $$;

create or replace function public.edit_message(p_message_id bigint, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v      messages;
  v_body text := btrim(coalesce(p_body, ''));
begin
  select * into v from messages where id = p_message_id;
  if not found or v.kind <> 'text' or v.deleted_at is not null then
    raise exception 'NOT_EDITABLE';
  end if;
  if public.person_of(v.user_id) is distinct from public.my_person() or not public.is_member(v.room_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if v.created_at < now() - interval '24 hours' then
    raise exception 'TOO_OLD';
  end if;
  if char_length(v_body) not between 1 and 5000 then
    raise exception 'INVALID_BODY';
  end if;
  if v_body = v.body then
    return;
  end if;

  update messages set body = v_body, edited_at = now() where id = p_message_id;

  update messages set reply_snapshot = jsonb_set(reply_snapshot, '{body}', to_jsonb(left(v_body, 120)))
  where reply_to = p_message_id and reply_snapshot ? 'body';
end $$;

-- 채팅 목록: 인원수는 사람 수, 안 읽은 수에서 내 다른 기기에서 보낸 메시지 제외
drop function public.my_rooms();
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
  notifications_enabled boolean
) language sql stable security definer set search_path = public as $$
  select
    r.id, r.name, r.code,
    (select count(distinct x.person_id)::int from room_members x where x.room_id = r.id),
    (select count(*)::int from messages x
      where x.room_id = r.id and x.id > m.last_read_id
        and x.kind <> 'system' and x.sender_person is distinct from m.person_id),
    lm.kind, lm.body, lm.sender_name, lm.is_urgent, lm.deleted_at is not null,
    coalesce(lm.created_at, r.created_at),
    m.muted, r.notifications_enabled
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
revoke execute on function public.create_link_code() from public, anon;
revoke execute on function public.link_device(text) from public, anon;
revoke execute on function public.my_admin() from public, anon;
revoke execute on function public.devices_of(uuid) from public, anon, authenticated;
