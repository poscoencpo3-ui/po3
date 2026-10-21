-- =====================================================================
--  협력사 소통방 v2 - 일정, 답장, 삭제, 긴급, 파일, 작업일보, 멘션, 푸시 알림
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (처음 설치라면 20261021000000_init.sql 을 먼저 실행해야 합니다)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 메시지 확장
-- ---------------------------------------------------------------------

alter table public.messages
  add column reply_to       bigint references public.messages (id) on delete set null,
  add column reply_snapshot jsonb,
  add column is_urgent      boolean not null default false,
  add column mentions       uuid[] not null default '{}',
  add column file_path      text,
  add column file_name      text check (char_length(file_name) <= 200),
  add column file_size      bigint,
  add column data           jsonb check (data is null or char_length(data::text) <= 5000),
  add column deleted_at     timestamptz,
  add column deleted_by     uuid,
  add column pushed_at      timestamptz;

-- 기존 제약조건을 새 종류(파일, 작업일보)와 삭제된 메시지에 맞게 다시 만듦
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.messages'::regclass and contype = 'c'
             and conname not in ('messages_body_check', 'messages_file_name_check', 'messages_data_check')
  loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.messages
  add constraint messages_kind_check check (kind in ('text', 'image', 'file', 'report', 'system')),
  add constraint messages_text_check check (kind <> 'text' or deleted_at is not null or char_length(btrim(body)) > 0),
  add constraint messages_image_check check (kind <> 'image' or deleted_at is not null or image_path is not null),
  add constraint messages_file_check check (kind <> 'file' or deleted_at is not null or file_path is not null),
  add constraint messages_report_check check (kind <> 'report' or deleted_at is not null or data is not null);

create index messages_reply_to_idx on public.messages (reply_to) where reply_to is not null;
create index messages_file_cleanup_idx on public.messages (created_at)
  where kind = 'file' and not image_expired;

-- 보낸 사람 정보, 답장 미리보기는 서버에서 채움 (위조 방지)
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
  if new.kind <> 'system' then
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

drop policy "messages: members send" on public.messages;
create policy "messages: members send" on public.messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_member(room_id)
    and kind in ('text', 'image', 'file', 'report')
    and (kind <> 'image' or image_path like room_id::text || '/%')
    and (kind <> 'file' or file_path like room_id::text || '/%')
  );

-- 삭제된 사진/파일은 매일 정리 작업이 Storage 에서 지움
create table public.storage_trash (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  path       text not null,
  created_at timestamptz not null default now()
);
alter table public.storage_trash enable row level security;

-- 메시지 삭제: 본인 메시지는 언제든, 관리자는 모든 메시지
create or replace function public.delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v messages;
begin
  select * into v from messages where id = p_message_id;
  if not found or v.kind = 'system' or v.deleted_at is not null then
    return;
  end if;
  if not public.is_member(v.room_id)
     or (v.user_id is distinct from auth.uid() and not public.is_admin()) then
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

  -- 이 메시지를 인용한 답장의 미리보기도 지움
  update messages set reply_snapshot = jsonb_build_object('deleted', true)
  where reply_to = p_message_id;

  update rooms set notice_message_id = null where notice_message_id = p_message_id;
end $$;

-- 공지: 삭제된 메시지는 공지로 등록 불가
create or replace function public.set_notice(p_room uuid, p_message_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() or not public.is_member(p_room) then
    raise exception 'NOT_ADMIN';
  end if;
  if p_message_id is not null and not exists (
    select 1 from messages
    where id = p_message_id and room_id = p_room and kind <> 'system' and deleted_at is null
  ) then
    raise exception 'INVALID_MESSAGE';
  end if;

  update rooms set notice_message_id = p_message_id where id = p_room;

  insert into messages (room_id, user_id, kind, body)
  values (p_room, null, 'system',
          case when p_message_id is null then '공지가 해제되었습니다.' else '공지가 등록되었습니다.' end);
end $$;

-- 채팅 목록: 긴급/삭제 여부도 함께
drop function public.my_rooms();
create function public.my_rooms()
returns table (
  room_id      uuid,
  name         text,
  code         text,
  member_count int,
  unread       int,
  last_kind    text,
  last_body    text,
  last_sender  text,
  last_urgent  boolean,
  last_deleted boolean,
  last_at      timestamptz
) language sql stable security definer set search_path = public as $$
  select
    r.id, r.name, r.code,
    (select count(*)::int from room_members x where x.room_id = r.id),
    (select count(*)::int from messages x
      where x.room_id = r.id and x.id > m.last_read_id
        and x.kind <> 'system' and x.user_id is distinct from auth.uid()),
    lm.kind, lm.body, lm.sender_name, lm.is_urgent, lm.deleted_at is not null,
    coalesce(lm.created_at, r.created_at)
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
revoke execute on function public.delete_message(bigint) from public, anon;

-- ---------------------------------------------------------------------
-- 일정 (달력)
-- ---------------------------------------------------------------------

create table public.schedules (
  id           bigint generated always as identity primary key,
  room_id      uuid not null references public.rooms (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 100),
  memo         text not null default '' check (char_length(memo) <= 1000),
  start_date   date not null,
  end_date     date not null,
  pinned       boolean not null default false,
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  creator_name text,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);
create index schedules_room_idx on public.schedules (room_id, start_date);

-- 누구나 등록 가능, 상단 고정은 관리자만
create or replace function public.schedules_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    select display_name into new.creator_name
    from room_members where room_id = new.room_id and user_id = new.created_by;
    if not public.is_admin() then
      new.pinned := false;
    end if;
  else
    new.room_id := old.room_id;
    new.created_by := old.created_by;
    new.creator_name := old.creator_name;
    new.created_at := old.created_at;
    if new.pinned <> old.pinned and not public.is_admin() then
      raise exception 'NOT_ADMIN';
    end if;
  end if;
  return new;
end $$;

create trigger schedules_before_write
  before insert or update on public.schedules
  for each row execute function public.schedules_before_write();

-- 일정이 등록되면 채팅방에 안내 메시지
create or replace function public.schedules_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into messages (room_id, user_id, kind, body)
  values (new.room_id, null, 'system',
    '📅 ' || coalesce(new.creator_name, '') || '님이 일정을 등록했습니다: ' || new.title || ' ('
    || to_char(new.start_date, 'FMMM/FMDD')
    || case when new.end_date <> new.start_date then '~' || to_char(new.end_date, 'FMMM/FMDD') else '' end
    || ')');
  return new;
end $$;

create trigger schedules_after_insert
  after insert on public.schedules
  for each row execute function public.schedules_after_insert();

alter table public.schedules enable row level security;

create policy "schedules: members read" on public.schedules
  for select to authenticated using (public.is_member(room_id));
create policy "schedules: members add" on public.schedules
  for insert to authenticated with check (public.is_member(room_id) and created_by = auth.uid());
create policy "schedules: owner or admin edit" on public.schedules
  for update to authenticated
  using (public.is_member(room_id) and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_member(room_id));
create policy "schedules: owner or admin delete" on public.schedules
  for delete to authenticated
  using (public.is_member(room_id) and (created_by = auth.uid() or public.is_admin()));

alter publication supabase_realtime add table public.schedules;

-- ---------------------------------------------------------------------
-- 푸시 알림
-- ---------------------------------------------------------------------

-- 서버 설정값 (푸시 서명 키 등). 클라이언트 접근 불가.
create table public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;

create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- 같은 브라우저에서 다른 계정으로 로그인하면 주인이 바뀌도록 함수로 저장
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.remove_push_subscription(text) from public, anon;

-- ---------------------------------------------------------------------
-- 파일 저장소 (PDF, 엑셀 등). 방 멤버만 열람/업로드
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 20971520)
on conflict (id) do nothing;

create policy "chat-files: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-files' and public.is_member_of_folder(name));

create policy "chat-files: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-files' and public.is_member_of_folder(name));
