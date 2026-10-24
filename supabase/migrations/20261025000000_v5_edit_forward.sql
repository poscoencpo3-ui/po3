-- =====================================================================
--  협력사 소통방 v5 - 메시지 수정 · 전달
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
-- =====================================================================

alter table public.messages
  add column edited_at    timestamptz,
  add column is_forwarded boolean not null default false;

-- 수정 표시는 서버만 붙일 수 있도록 (전달 표시는 보내는 쪽에서 지정)
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

-- 메시지 수정: 본인이 보낸 글 메시지, 보낸 지 24시간 이내
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
  if v.user_id is distinct from auth.uid() or not public.is_member(v.room_id) then
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

  -- 이 메시지를 인용한 답장의 미리보기도 새 내용으로
  update messages set reply_snapshot = jsonb_set(reply_snapshot, '{body}', to_jsonb(left(v_body, 120)))
  where reply_to = p_message_id and reply_snapshot ? 'body';
end $$;

revoke execute on function public.edit_message(bigint, text) from public, anon;
