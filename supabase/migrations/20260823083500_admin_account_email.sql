create or replace function public.yamachan_admin_reset_email()
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  stored text;
begin
  select value into stored
  from private.yamachan_settings
  where key = 'admin_email';

  return stored;
end;
$$;

create or replace function public.yamachan_admin_username()
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  stored text;
begin
  select value into stored
  from private.yamachan_settings
  where key = 'admin_username';

  return stored;
end;
$$;

grant execute on function public.yamachan_admin_reset_email() to anon, authenticated;
grant execute on function public.yamachan_admin_username() to anon, authenticated;

create or replace function public.yamachan_admin_set_password_hash(
  p_secret text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  if p_password is null or length(trim(p_password)) < 8 then
    raise exception 'password-too-short';
  end if;

  insert into private.yamachan_settings (key, value)
  values ('admin_password_hash', crypt(p_password, gen_salt('bf')))
  on conflict (key) do update
  set value = excluded.value;
end;
$$;

create or replace function public.yamachan_verify_admin_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  stored text;
begin
  select value
  into stored
  from private.yamachan_settings
  where key = 'admin_password_hash';

  if stored is null or stored = '' or p_password is null or p_password = '' then
    return false;
  end if;

  return stored = crypt(p_password, stored);
end;
$$;
