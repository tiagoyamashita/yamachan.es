create schema if not exists private;

create table if not exists private.yamachan_settings (
  key text primary key,
  value text not null default ''
);

revoke all on schema private from public;
revoke all on table private.yamachan_settings from public;

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

-- After running migrations, seed the write secret once in Supabase SQL editor:
-- insert into private.yamachan_settings (key, value)
-- values ('admin_write_secret', '<same value as ADMIN_WRITE_SECRET in .env>')
-- on conflict (key) do update set value = excluded.value;
