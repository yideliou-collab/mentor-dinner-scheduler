-- Extend the daily calendar to 00:00–24:00 without changing existing availability.
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
