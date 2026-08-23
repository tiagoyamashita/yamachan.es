-- Save recovery email from admin panel + password recovery helpers.

create or replace function private.yamachan_assert_admin(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  stored text;
begin
  if p_secret is null or btrim(p_secret) = '' then
    raise exception 'unauthorized';
  end if;

  select value
  into stored
  from private.yamachan_settings
  where key in ('admin_write_secret', 'admin_secret')
  order by case key when 'admin_write_secret' then 0 else 1 end
  limit 1;

  if stored is null or stored = '' then
    raise exception 'admin-write-secret-not-configured';
  end if;

  if stored <> p_secret then
    raise exception 'unauthorized';
  end if;
end;
$$;

create or replace function public.yamachan_admin_set_reset_email(
  p_secret text,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  if p_email is null or position('@' in trim(p_email)) < 2 then
    raise exception 'invalid-email';
  end if;

  insert into private.yamachan_settings (key, value)
  values ('admin_email', trim(p_email))
  on conflict (key) do update
  set value = excluded.value;
end;
$$;

create or replace function public.yamachan_admin_clear_password_hash(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  delete from private.yamachan_settings
  where key = 'admin_password_hash';
end;
$$;

grant execute on function public.yamachan_admin_set_reset_email(text, text) to anon, authenticated;
grant execute on function public.yamachan_admin_clear_password_hash(text) to anon, authenticated;
