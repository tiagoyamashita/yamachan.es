-- Instagram carousel permalinks (admin-managed, public read for the site feed).

create or replace function public.yamachan_get_instagram_post_urls()
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
  where key = 'instagram_post_urls';

  return coalesce(stored, '');
end;
$$;

create or replace function public.yamachan_admin_set_instagram_post_urls(
  p_secret text,
  p_urls text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  insert into private.yamachan_settings (key, value)
  values ('instagram_post_urls', coalesce(p_urls, ''))
  on conflict (key) do update
  set value = excluded.value;

  return coalesce(p_urls, '');
end;
$$;

revoke all on function public.yamachan_get_instagram_post_urls() from public;
revoke all on function public.yamachan_admin_set_instagram_post_urls(text, text) from public;

grant execute on function public.yamachan_get_instagram_post_urls() to anon, authenticated;
grant execute on function public.yamachan_admin_set_instagram_post_urls(text, text) to anon, authenticated;
