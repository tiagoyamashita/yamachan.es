-- Manually curated Google reviews (admin-managed, public read for the site feed).

create or replace function public.yamachan_get_reviews()
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
  where key = 'google_reviews';

  return coalesce(stored, '');
end;
$$;

create or replace function public.yamachan_admin_set_reviews(
  p_secret text,
  p_reviews text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  insert into private.yamachan_settings (key, value)
  values ('google_reviews', coalesce(p_reviews, ''))
  on conflict (key) do update
  set value = excluded.value;

  return coalesce(p_reviews, '');
end;
$$;

revoke all on function public.yamachan_get_reviews() from public;
revoke all on function public.yamachan_admin_set_reviews(text, text) from public;

grant execute on function public.yamachan_get_reviews() to anon, authenticated;
grant execute on function public.yamachan_admin_set_reviews(text, text) to anon, authenticated;
