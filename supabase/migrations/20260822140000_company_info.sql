create table if not exists public.yamachan_company_info (
  id text primary key default 'default',
  phone text not null,
  phone_display text not null,
  address_lines jsonb not null default '[]'::jsonb,
  neighborhood text not null default '',
  hours_note text not null default '',
  hours jsonb not null default '[]'::jsonb,
  open_weekdays integer[] not null default '{3,4,5,6}',
  lunch_open text not null default '13:00',
  lunch_close text not null default '16:30',
  updated_at timestamptz not null default now()
);

alter table public.yamachan_company_info enable row level security;

drop policy if exists "Public read company info" on public.yamachan_company_info;

create policy "Public read company info"
  on public.yamachan_company_info
  for select
  using (true);

insert into public.yamachan_company_info (
  id,
  phone,
  phone_display,
  address_lines,
  neighborhood,
  hours_note,
  hours,
  open_weekdays,
  lunch_open,
  lunch_close
)
values (
  'default',
  '+34604949252',
  '+34 604 94 92 52',
  '["C/ Pardo Gimeno, 10", "Local izquierda", "03007 Alicante"]'::jsonb,
  'Barrio de Benalúa, junto a Plaza de Navarro Rodrigo.',
  'El horario puede cambiar. Confírmalo en Instagram o al reservar.',
  '[{"days": "Miércoles – sábado", "time": "13:00 – 16:30"}, {"days": "Domingo – martes", "time": "Cerrado"}]'::jsonb,
  '{3,4,5,6}',
  '13:00',
  '16:30'
)
on conflict (id) do nothing;

create or replace function public.yamachan_admin_get_company_info(p_secret text)
returns public.yamachan_company_info
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.yamachan_assert_admin(p_secret);

  return (
    select *
    from public.yamachan_company_info
    where id = 'default'
  );
end;
$$;

create or replace function public.yamachan_admin_upsert_company_info(
  p_secret text,
  p_info jsonb
)
returns public.yamachan_company_info
language plpgsql
security definer
set search_path = public, private
as $$
declare
  saved public.yamachan_company_info;
begin
  perform private.yamachan_assert_admin(p_secret);

  insert into public.yamachan_company_info as info (
    id,
    phone,
    phone_display,
    address_lines,
    neighborhood,
    hours_note,
    hours,
    open_weekdays,
    lunch_open,
    lunch_close,
    updated_at
  )
  values (
    'default',
    coalesce(p_info->>'phone', ''),
    coalesce(p_info->>'phone_display', ''),
    coalesce(p_info->'address_lines', '[]'::jsonb),
    coalesce(p_info->>'neighborhood', ''),
    coalesce(p_info->>'hours_note', ''),
    coalesce(p_info->'hours', '[]'::jsonb),
    coalesce(
      (
        select array_agg(value::integer)
        from jsonb_array_elements_text(coalesce(p_info->'open_weekdays', '[]'::jsonb)) as value
      ),
      '{3,4,5,6}'::integer[]
    ),
    coalesce(p_info->>'lunch_open', '13:00'),
    coalesce(p_info->>'lunch_close', '16:30'),
    now()
  )
  on conflict (id) do update
  set
    phone = excluded.phone,
    phone_display = excluded.phone_display,
    address_lines = excluded.address_lines,
    neighborhood = excluded.neighborhood,
    hours_note = excluded.hours_note,
    hours = excluded.hours,
    open_weekdays = excluded.open_weekdays,
    lunch_open = excluded.lunch_open,
    lunch_close = excluded.lunch_close,
    updated_at = now()
  returning * into saved;

  return saved;
end;
$$;

grant select on public.yamachan_company_info to anon, authenticated;
grant execute on function public.yamachan_admin_get_company_info(text) to anon, authenticated;
grant execute on function public.yamachan_admin_upsert_company_info(text, jsonb) to anon, authenticated;
