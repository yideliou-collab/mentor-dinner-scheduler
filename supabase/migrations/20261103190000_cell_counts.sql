-- Show occupancy in every selected half-hour while preserving the two-hour summary.
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
