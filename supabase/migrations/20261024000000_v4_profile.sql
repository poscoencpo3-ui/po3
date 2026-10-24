-- =====================================================================
--  협력사 소통방 v4 - 내 이름/소속 변경을 모든 채팅방에 바로 적용
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
-- =====================================================================

create or replace function public.update_my_profile(p_name text, p_company text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_old     record;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  if char_length(v_name) not between 1 and 20 or char_length(v_company) > 30 then
    raise exception 'INVALID_PROFILE';
  end if;

  update admins set display_name = v_name, company = v_company where user_id = auth.uid();

  -- 이름이 바뀐 방마다 안내 메시지 (다른 사람으로 오해하지 않도록)
  for v_old in
    select room_id, display_name, company from room_members
    where user_id = auth.uid() and (display_name <> v_name or company <> v_company)
  loop
    update room_members set display_name = v_name, company = v_company
    where room_id = v_old.room_id and user_id = auth.uid();

    if v_old.display_name <> v_name then
      insert into messages (room_id, user_id, kind, body)
      values (v_old.room_id, null, 'system', v_old.display_name || '님이 이름을 ' || v_name || '(으)로 변경했습니다.');
    end if;
  end loop;

  -- 지난 메시지에 표시되는 이름도 함께 변경
  update messages set sender_name = v_name, sender_company = v_company
  where user_id = auth.uid() and kind <> 'system'
    and (sender_name is distinct from v_name or sender_company is distinct from v_company);
end $$;

revoke execute on function public.update_my_profile(text, text) from public, anon;
