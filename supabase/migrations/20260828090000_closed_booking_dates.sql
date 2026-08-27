-- Admin-managed closed booking dates (blocks new reservations for those days).

create or replace function public.yamachan_get_closed_booking_dates()
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  stored text;
begin
  select value
  into stored
  from private.yamachan_settings
  where key = 'closed_booking_dates';

  return coalesce(stored, '[]');
end;
$$;

create or replace function public.yamachan_admin_set_closed_booking_dates(
  p_secret text,
  p_dates text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  insert into private.yamachan_settings (key, value)
  values ('closed_booking_dates', coalesce(p_dates, '[]'))
  on conflict (key) do update
  set value = excluded.value;

  return coalesce(p_dates, '[]');
end;
$$;

revoke all on function public.yamachan_get_closed_booking_dates() from public;
revoke all on function public.yamachan_admin_set_closed_booking_dates(text, text) from public;

grant execute on function public.yamachan_get_closed_booking_dates() to anon, authenticated;
grant execute on function public.yamachan_admin_set_closed_booking_dates(text, text) to anon, authenticated;
