-- Takeout master switch + per-dish sellable quantities (admin-managed).

create or replace function public.yamachan_get_takeout_catalog()
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
  where key = 'takeout_catalog';

  return coalesce(stored, '');
end;
$$;

create or replace function public.yamachan_admin_set_takeout_catalog(
  p_secret text,
  p_catalog text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  insert into private.yamachan_settings (key, value)
  values ('takeout_catalog', coalesce(p_catalog, ''))
  on conflict (key) do update
  set value = excluded.value;

  return coalesce(p_catalog, '');
end;
$$;

revoke all on function public.yamachan_get_takeout_catalog() from public;
revoke all on function public.yamachan_admin_set_takeout_catalog(text, text) from public;

grant execute on function public.yamachan_get_takeout_catalog() to anon, authenticated;
grant execute on function public.yamachan_admin_set_takeout_catalog(text, text) to anon, authenticated;
