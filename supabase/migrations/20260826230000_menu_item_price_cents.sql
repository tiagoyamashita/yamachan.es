-- Persist per-item prices from admin and keep the upsert RPC in sync.
alter table public.yamachan_menu_items
  add column if not exists price_cents integer not null default 0
  check (price_cents >= 0);

create or replace function public.yamachan_admin_upsert_menu_item(p_secret text, p_item jsonb)
returns public.yamachan_menu_items
language plpgsql
security definer
set search_path = public, private
as $$
declare
  saved public.yamachan_menu_items;
  item_id uuid;
  item_slug text;
  item_allergens text[];
  item_price integer;
begin
  perform private.yamachan_assert_admin(p_secret);

  item_id := nullif(p_item->>'id', '')::uuid;
  item_slug := nullif(regexp_replace(trim(coalesce(p_item->>'slug', '')), '[^a-zA-Z0-9_-]+', '-', 'g'), '');
  if item_slug is null then
    raise exception 'slug required';
  end if;

  item_price := greatest(coalesce((p_item->>'price_cents')::integer, 0), 0);

  select coalesce(array_agg(u.allergen order by u.ord), '{}'::text[])
  into item_allergens
  from unnest(array[
    'gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts',
    'celery','mustard','sesame','sulphites','lupin','molluscs'
  ]::text[]) with ordinality as u(allergen, ord)
  join jsonb_array_elements_text(coalesce(p_item->'allergens', '[]'::jsonb)) as v(allergen)
    on v.allergen = u.allergen;

  insert into public.yamachan_menu_items (
    id,
    slug,
    category_id,
    name_es,
    name_en,
    name_ja,
    blurb_es,
    blurb_en,
    image_url,
    vegetarian,
    sort_order,
    published,
    allergens,
    price_cents,
    updated_at
  )
  values (
    coalesce(item_id, gen_random_uuid()),
    item_slug,
    p_item->>'category_id',
    coalesce(p_item->>'name_es', ''),
    coalesce(p_item->>'name_en', ''),
    coalesce(p_item->>'name_ja', ''),
    coalesce(p_item->>'blurb_es', ''),
    coalesce(p_item->>'blurb_en', ''),
    coalesce(p_item->>'image_url', ''),
    coalesce((p_item->>'vegetarian')::boolean, false),
    coalesce((p_item->>'sort_order')::integer, 0),
    coalesce((p_item->>'published')::boolean, true),
    item_allergens,
    item_price,
    now()
  )
  on conflict (id) do update set
    slug = excluded.slug,
    category_id = excluded.category_id,
    name_es = excluded.name_es,
    name_en = excluded.name_en,
    name_ja = excluded.name_ja,
    blurb_es = excluded.blurb_es,
    blurb_en = excluded.blurb_en,
    image_url = excluded.image_url,
    vegetarian = excluded.vegetarian,
    sort_order = excluded.sort_order,
    published = excluded.published,
    allergens = excluded.allergens,
    price_cents = excluded.price_cents,
    updated_at = now()
  returning * into saved;

  return saved;
end;
$$;

update public.yamachan_menu_items
set price_cents = case slug
  when 'edamame' then 550
  when 'gyozaPork' then 850
  when 'gyozaVeg' then 850
  when 'takoyaki' then 900
  when 'mushrooms' then 800
  when 'sushi' then 1400
  when 'sashimi' then 1600
  when 'hotPhilly' then 1300
  when 'katsudon' then 1350
  when 'katsuCurry' then 1350
  when 'yakinikuDon' then 1400
  when 'karaageCurry' then 1300
  when 'okonomiyaki' then 1200
  when 'yakisoba' then 1200
  when 'tempuraUdon' then 1300
  when 'friedTofu' then 700
  when 'appleGyoza' then 700
  when 'mochi' then 500
  when 'japaneseBeer' then 350
  else price_cents
end
where price_cents = 0;
