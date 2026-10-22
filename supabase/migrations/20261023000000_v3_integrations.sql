-- =====================================================================
--  협력사 소통방 v3 - 외부 사이트 연동 (예: 화이트보드 포스트잇 알림)
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
--  (v2 SQL 을 먼저 실행한 상태여야 합니다)
-- =====================================================================

-- 외부 사이트가 보낸 알림 메시지 종류 'bot'
alter table public.messages drop constraint messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('text', 'image', 'file', 'report', 'bot', 'system'));
alter table public.messages
  add constraint messages_bot_check check (kind <> 'bot' or deleted_at is not null or data is not null);

-- 보낸 사람 이름: 사람 메시지는 서버가 채우고, 연동(bot) 메시지는 연동 이름을 그대로 사용
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

-- 연동 목록. 키 원문은 저장하지 않고 해시만 보관
create table public.integrations (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 30),
  token_hash   text not null unique,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index integrations_room_idx on public.integrations (room_id);

alter table public.integrations enable row level security;
create policy "integrations: admins read" on public.integrations
  for select to authenticated using (public.is_admin());

-- 연동 추가 (관리자). 키 원문은 이때 한 번만 돌려줌
create or replace function public.create_integration(p_room uuid, p_name text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(gen_random_bytes(24), 'hex');
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  insert into integrations (room_id, name, token_hash, created_by)
  values (p_room, btrim(p_name), encode(digest(v_token, 'sha256'), 'hex'), auth.uid());

  insert into messages (room_id, user_id, kind, body)
  values (p_room, null, 'system', '📌 ' || btrim(p_name) || ' 연동이 추가되었습니다.');
  return v_token;
end $$;

create or replace function public.delete_integration(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v integrations;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  delete from integrations where id = p_id returning * into v;
  if found then
    insert into messages (room_id, user_id, kind, body)
    values (v.room_id, null, 'system', '📌 ' || v.name || ' 연동이 해제되었습니다.');
  end if;
end $$;

revoke execute on function public.create_integration(uuid, text) from public, anon;
revoke execute on function public.delete_integration(uuid) from public, anon;
