-- 在 Supabase SQL Editor 執行一次。公開用戶端沒有任何資料表讀取權限。
create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  account_hash text not null unique,
  pin_salt text not null,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token_hash text primary key,
  participant_id uuid not null references public.participants(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_participant_idx on public.sessions(participant_id);

create table if not exists public.availability (
  participant_id uuid not null references public.participants(id) on delete cascade,
  day date not null,
  slot text not null,
  created_at timestamptz not null default now(),
  primary key (participant_id, day, slot)
);
create index if not exists availability_day_slot_idx on public.availability(day, slot);

alter table public.participants enable row level security;
alter table public.sessions enable row level security;
alter table public.availability enable row level security;
revoke all on public.participants, public.sessions, public.availability from public, anon, authenticated;
grant all on public.participants, public.sessions, public.availability to service_role;

create or replace function public.slot_counts()
returns table(day date, slot text, attendees bigint)
language sql stable security invoker set search_path = public
as $$
  select a.day, a.slot, count(*)::bigint as attendees
  from public.availability a
  join public.availability b on b.participant_id = a.participant_id and b.day = a.day and b.slot = to_char(date '2000-01-01' + a.slot::time + interval '30 minutes', 'HH24:MI')
  join public.availability c on c.participant_id = a.participant_id and c.day = a.day and c.slot = to_char(date '2000-01-01' + a.slot::time + interval '60 minutes', 'HH24:MI')
  join public.availability d on d.participant_id = a.participant_id and d.day = a.day and d.slot = to_char(date '2000-01-01' + a.slot::time + interval '90 minutes', 'HH24:MI')
  where a.day between (now() at time zone 'Asia/Taipei')::date and date '2026-12-14'
    and a.slot::time between time '00:00' and time '22:00'
  group by a.day, a.slot
  order by a.day, a.slot;
$$;
revoke all on function public.slot_counts() from public, anon, authenticated;
grant execute on function public.slot_counts() to service_role;

create or replace function public.cell_counts()
returns table(day date, slot text, attendees bigint)
language sql stable security invoker set search_path = public
as $$
  select a.day, a.slot, count(*)::bigint as attendees
  from public.availability a
  where a.day between (now() at time zone 'Asia/Taipei')::date and date '2026-12-14'
    and a.slot::time between time '00:00' and time '23:30'
  group by a.day, a.slot
  order by a.day, a.slot;
$$;
revoke all on function public.cell_counts() from public, anon, authenticated;
grant execute on function public.cell_counts() to service_role;
