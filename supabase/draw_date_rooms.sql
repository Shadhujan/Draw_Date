-- Draw_Date uses the existing Lovebug Supabase project without touching Lovebug data.
-- The database stores only room membership; artwork remains local/in Realtime.
-- Applied via the Supabase migration API as draw_date_private_rooms.
create table if not exists public.draw_date_rooms (
  room_id text primary key check (room_id ~ '^[0-9a-f]{32}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint draw_date_distinct_artists check (guest_id is distinct from host_id)
);

create index if not exists draw_date_rooms_host_recent_idx
  on public.draw_date_rooms(host_id, created_at desc);

alter table public.draw_date_rooms enable row level security;
revoke all on public.draw_date_rooms from public, anon, authenticated;
grant select on public.draw_date_rooms to authenticated;

create policy draw_date_rooms_participants_read
  on public.draw_date_rooms for select to authenticated
  using ((select auth.uid()) in (host_id, guest_id) and expires_at > now());

-- A single row lock serializes competing guests. The first two authenticated
-- identities (host + one guest) are the only members allowed in the room.
create function public.draw_date_enter_room(p_room_id text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_host uuid;
  v_guest uuid;
  v_expires timestamptz;
begin
  if v_user is null then
    raise exception 'draw_date_auth_required' using errcode = '28000';
  end if;
  if p_room_id is null or p_room_id !~ '^[0-9a-f]{32}$' then
    raise exception 'draw_date_invalid_room' using errcode = '22023';
  end if;

  -- A user can open a new room with a strong client-generated random room ID.
  -- Ratelimit new rooms per hour to avoid unnecessary free-tier usage.
  if not exists (select 1 from public.draw_date_rooms r where r.room_id = p_room_id) then
    if (select count(*) from public.draw_date_rooms r
        where r.host_id = v_user and r.created_at > now() - interval '1 hour') >= 12 then
      raise exception 'draw_date_room_limit' using errcode = 'P0001';
    end if;
  end if;

  insert into public.draw_date_rooms(room_id, host_id)
  values (p_room_id, v_user)
  on conflict (room_id) do nothing;

  select r.host_id, r.guest_id, r.expires_at
    into v_host, v_guest, v_expires
  from public.draw_date_rooms r
  where r.room_id = p_room_id
  for update;

  if v_expires <= now() then
    raise exception 'draw_date_expired' using errcode = 'P0001';
  end if;
  if v_host = v_user then return 'host'; end if;
  if v_guest = v_user then return 'guest'; end if;
  if v_guest is not null then
    raise exception 'draw_date_room_full' using errcode = 'P0001';
  end if;

  update public.draw_date_rooms set guest_id = v_user where room_id = p_room_id;
  return 'guest';
end;
$$;

revoke all on function public.draw_date_enter_room(text) from public, anon;
grant execute on function public.draw_date_enter_room(text) to authenticated;

-- This function is used by Realtime RLS only. It never returns private metadata.
create function public.draw_date_topic_allowed(p_topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (p_topic ~ '^draw-date:secure:[0-9a-f]{32}$')
    and exists (
      select 1 from public.draw_date_rooms r
      where r.room_id = right(p_topic, 32)
        and r.expires_at > now()
        and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid()))
    ), false
  );
$$;

revoke all on function public.draw_date_topic_allowed(text) from public, anon;
grant execute on function public.draw_date_topic_allowed(text) to authenticated;

-- Existing Lovebug policies allow other Realtime topics. These RESTRICTIVE
-- policies prevent those older broad policies from granting access to the new
-- Draw_Date topics. For non-Draw_Date topics they evaluate to TRUE, leaving
-- Lovebug's existing behavior unchanged.
create policy draw_date_private_read_guard
  on realtime.messages as restrictive for select to authenticated
  using (
    (select realtime.topic()) not like 'draw-date:%'
    or (extension in ('broadcast', 'presence')
        and public.draw_date_topic_allowed((select realtime.topic())))
  );
create policy draw_date_private_write_guard
  on realtime.messages as restrictive for insert to authenticated
  with check (
    (select realtime.topic()) not like 'draw-date:%'
    or (extension in ('broadcast', 'presence')
        and public.draw_date_topic_allowed((select realtime.topic())))
  );

-- Own permissive policies keep Draw_Date working if Lovebug's policies change.
create policy draw_date_private_receive
  on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) like 'draw-date:%'
    and extension in ('broadcast', 'presence')
    and public.draw_date_topic_allowed((select realtime.topic()))
  );
create policy draw_date_private_send
  on realtime.messages for insert to authenticated
  with check (
    (select realtime.topic()) like 'draw-date:%'
    and extension in ('broadcast', 'presence')
    and public.draw_date_topic_allowed((select realtime.topic()))
  );
