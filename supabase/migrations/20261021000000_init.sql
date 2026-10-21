-- =====================================================================
--  협력사 소통방 - Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------------

-- 관리자 (방을 만들 수 있는 사람). 대시보드에서 계정을 만든 뒤 여기에 등록합니다.
create table public.admins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  company      text not null default '' check (char_length(company) <= 30)
);

create table public.rooms (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 50),
  code              text not null unique,
  notice_message_id bigint,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

create table public.room_members (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  company      text not null default '' check (char_length(company) <= 30),
  is_admin     boolean not null default false,
  last_read_id bigint not null default 0,
  joined_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id);

create table public.messages (
  id             bigint generated always as identity primary key,
  room_id        uuid not null references public.rooms (id) on delete cascade,
  user_id        uuid default auth.uid() references auth.users (id) on delete set null,
  kind           text not null default 'text' check (kind in ('text', 'image', 'system')),
  body           text not null default '' check (char_length(body) <= 5000),
  sender_name    text,
  sender_company text,
  image_path     text,
  image_width    int,
  image_height   int,
  image_expired  boolean not null default false,
  created_at     timestamptz not null default now(),
  check (kind <> 'text' or char_length(btrim(body)) > 0),
  check (kind <> 'image' or image_path is not null)
);
create index messages_room_id_idx on public.messages (room_id, id desc);
create index messages_image_cleanup_idx on public.messages (created_at)
  where kind = 'image' and not image_expired;

alter table public.rooms
  add constraint rooms_notice_message_fk
  foreign key (notice_message_id) references public.messages (id) on delete set null;

-- 코드 입력 실패 기록 (무작위 대입 방지용)
create table public.join_failures (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index join_failures_user_idx on public.join_failures (user_id, at);

-- ---------------------------------------------------------------------
-- 권한 확인 함수 (RLS 정책에서 사용)
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.is_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members where room_id = p_room and user_id = auth.uid());
$$;

-- Storage 경로 "{room_id}/파일명" 의 첫 폴더로 방 멤버 여부 확인
create or replace function public.is_member_of_folder(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from room_members
    where room_id::text = split_part(p_name, '/', 1) and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 메시지 저장 시 보낸 사람 이름/소속을 서버에서 채움 (위조 방지)
-- ---------------------------------------------------------------------

create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.image_expired := false;
  if new.kind <> 'system' then
    select display_name, company into new.sender_name, new.sender_company
    from room_members where room_id = new.room_id and user_id = new.user_id;
  end if;
  return new;
end $$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

-- ---------------------------------------------------------------------
-- RLS (행 단위 보안)
-- ---------------------------------------------------------------------

alter table public.admins        enable row level security;
alter table public.rooms         enable row level security;
alter table public.room_members  enable row level security;
alter table public.messages      enable row level security;
alter table public.join_failures enable row level security;

create policy "admins: read own" on public.admins
  for select to authenticated using (user_id = auth.uid());
create policy "admins: update own profile" on public.admins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "rooms: members and admins read" on public.rooms
  for select to authenticated using (public.is_member(id) or public.is_admin());

create policy "members: room members and admins read" on public.room_members
  for select to authenticated using (public.is_member(room_id) or public.is_admin());

create policy "messages: members read" on public.messages
  for select to authenticated using (public.is_member(room_id));

create policy "messages: members send" on public.messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_member(room_id)
    and kind in ('text', 'image')
    and (kind = 'text' or image_path like room_id::text || '/%')
  );

-- join_failures 는 정책 없음 = 클라이언트 접근 불가 (함수에서만 사용)

-- ---------------------------------------------------------------------
-- RPC 함수 (클라이언트에서 supabase.rpc() 로 호출)
-- ---------------------------------------------------------------------

-- 헷갈리는 글자(0/O, 1/I/L)를 뺀 8자리 코드
create or replace function public.gen_room_code()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;
  return result;
end $$;

-- 방 만들기 (관리자 전용). 만든 관리자는 자동으로 입장합니다.
create or replace function public.create_room(p_name text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare
  v_admin admins;
  v_room  rooms;
begin
  select * into v_admin from admins where user_id = auth.uid();
  if not found then
    raise exception 'NOT_ADMIN';
  end if;

  loop
    begin
      insert into rooms (name, code, created_by)
      values (btrim(p_name), gen_room_code(), auth.uid())
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- 코드가 겹치면 다시 생성
    end;
  end loop;

  insert into room_members (room_id, user_id, display_name, company, is_admin)
  values (v_room.id, auth.uid(), v_admin.display_name, v_admin.company, true);

  insert into messages (room_id, user_id, kind, body)
  values (v_room.id, null, 'system', '채팅방이 만들어졌습니다.');

  return v_room;
end $$;

-- 코드로 입장. 잘못된 코드면 null 을 반환합니다.
create or replace function public.join_room(p_code text, p_name text, p_company text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_code    text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_name    text := btrim(coalesce(p_name, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_room    uuid;
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

  insert into room_members (room_id, user_id, display_name, company, is_admin, last_read_id)
  values (
    v_room, auth.uid(), v_name, v_company, public.is_admin(),
    coalesce((select max(id) from messages where room_id = v_room), 0)
  );

  v_label := v_name || case when v_company <> '' then ' (' || v_company || ')' else '' end;
  insert into messages (room_id, user_id, kind, body)
  values (v_room, null, 'system', v_label || '님이 들어왔습니다.');

  return v_room;
end $$;

-- 방 나가기
create or replace function public.leave_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_member room_members;
begin
  delete from room_members where room_id = p_room and user_id = auth.uid()
  returning * into v_member;
  if found then
    insert into messages (room_id, user_id, kind, body)
    values (p_room, null, 'system', v_member.display_name || '님이 나갔습니다.');
  end if;
end $$;

-- 읽음 위치 갱신 (읽음 숫자 계산용)
create or replace function public.mark_read(p_room uuid, p_message_id bigint)
returns void language sql security definer set search_path = public as $$
  update room_members set last_read_id = p_message_id
  where room_id = p_room and user_id = auth.uid() and last_read_id < p_message_id;
$$;

-- 공지 등록/해제 (관리자 전용). p_message_id 가 null 이면 해제.
create or replace function public.set_notice(p_room uuid, p_message_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() or not public.is_member(p_room) then
    raise exception 'NOT_ADMIN';
  end if;
  if p_message_id is not null and not exists (
    select 1 from messages where id = p_message_id and room_id = p_room and kind <> 'system'
  ) then
    raise exception 'INVALID_MESSAGE';
  end if;

  update rooms set notice_message_id = p_message_id where id = p_room;

  insert into messages (room_id, user_id, kind, body)
  values (p_room, null, 'system',
          case when p_message_id is null then '공지가 해제되었습니다.' else '공지가 등록되었습니다.' end);
end $$;

-- 내 채팅방 목록 (안 읽은 수, 마지막 메시지 포함)
create or replace function public.my_rooms()
returns table (
  room_id      uuid,
  name         text,
  code         text,
  member_count int,
  unread       int,
  last_kind    text,
  last_body    text,
  last_sender  text,
  last_at      timestamptz
) language sql stable security definer set search_path = public as $$
  select
    r.id, r.name, r.code,
    (select count(*)::int from room_members x where x.room_id = r.id),
    (select count(*)::int from messages x
      where x.room_id = r.id and x.id > m.last_read_id
        and x.kind <> 'system' and x.user_id is distinct from auth.uid()),
    lm.kind, lm.body, lm.sender_name, coalesce(lm.created_at, r.created_at)
  from room_members m
  join rooms r on r.id = m.room_id
  left join lateral (
    select kind, body, sender_name, created_at from messages
    where room_id = r.id order by id desc limit 1
  ) lm on true
  where m.user_id = auth.uid()
  order by coalesce(lm.created_at, r.created_at) desc;
$$;

revoke execute on function public.gen_room_code() from public, anon, authenticated;
revoke execute on function public.create_room(text) from public, anon;
revoke execute on function public.join_room(text, text, text) from public, anon;
revoke execute on function public.leave_room(uuid) from public, anon;
revoke execute on function public.mark_read(uuid, bigint) from public, anon;
revoke execute on function public.set_notice(uuid, bigint) from public, anon;
revoke execute on function public.my_rooms() from public, anon;

-- ---------------------------------------------------------------------
-- 실시간(Realtime) 대상 테이블
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.messages, public.room_members, public.rooms;

-- ---------------------------------------------------------------------
-- 사진 저장소 (비공개 버킷, 방 멤버만 열람/업로드)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "chat-images: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-images' and public.is_member_of_folder(name));

create policy "chat-images: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-images' and public.is_member_of_folder(name));
