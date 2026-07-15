-- ============================================================
-- Valleblond Photography — Collections et packs numériques
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- ============================================================

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  slug text unique,
  price_digital_pack numeric(10,2) check (price_digital_pack >= 0),
  is_published boolean not null default false,
  show_items_on_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  artwork_id uuid not null references public."Artworks"(id) on delete restrict,
  position smallint not null check (position > 0),
  primary key (collection_id, artwork_id),
  unique (collection_id, position)
);

create table if not exists public.collection_orders (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete restrict,
  paypal_order_id text not null unique,
  paypal_capture_id text unique,
  buyer_email text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  paypal_environment text check (paypal_environment in ('sandbox', 'live')),
  status text not null default 'created' check (status in ('created', 'completed', 'failed')),
  immediate_delivery_consent boolean not null default false,
  consent_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_orders enable row level security;

grant select on public.collections, public.collection_items to anon, authenticated;
grant select on public.collection_orders to authenticated;

create policy "Public can read published collections"
on public.collections for select to anon, authenticated
using (is_published = true);

create policy "Studio administrators can read all collections"
on public.collections for select to authenticated
using (exists (select 1 from public.studio_admins where user_id = auth.uid()));

create policy "Public can read items of published collections"
on public.collection_items for select to anon, authenticated
using (
  exists (
    select 1 from public.collections
    where id = collection_id and is_published = true
  )
);

create policy "Studio administrators can read all collection items"
on public.collection_items for select to authenticated
using (exists (select 1 from public.studio_admins where user_id = auth.uid()));

create policy "Studio administrators can read collection orders"
on public.collection_orders for select to authenticated
using (exists (select 1 from public.studio_admins where user_id = auth.uid()));

create or replace function public.save_collection(
  p_collection_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_price_digital_pack numeric,
  p_is_published boolean,
  p_show_items_on_home boolean,
  p_artwork_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  slug_base text;
  final_slug text;
  slug_index integer := 2;
begin
  if not exists (select 1 from public.studio_admins where user_id = auth.uid()) then
    raise exception 'Studio access denied' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Collection title is required' using errcode = '22023';
  end if;

  if coalesce(array_length(p_artwork_ids, 1), 0) < 2
    or (select count(distinct item_id) from unnest(p_artwork_ids) as item_id) <> array_length(p_artwork_ids, 1) then
    raise exception 'A collection requires at least two distinct artworks' using errcode = '22023';
  end if;

  if (select count(*) from public."Artworks" where id = any(p_artwork_ids)) <> array_length(p_artwork_ids, 1) then
    raise exception 'An artwork is unavailable' using errcode = 'P0002';
  end if;

  slug_base := nullif(trim(p_slug), '');
  final_slug := slug_base;
  while final_slug is not null and exists (
    select 1 from public.collections where slug = final_slug and (p_collection_id is null or id <> p_collection_id)
  ) loop
    final_slug := slug_base || '-' || slug_index;
    slug_index := slug_index + 1;
  end loop;

  if p_collection_id is null then
    insert into public.collections (title, slug, description, price_digital_pack, is_published, show_items_on_home)
    values (trim(p_title), final_slug, nullif(trim(p_description), ''), p_price_digital_pack, coalesce(p_is_published, false), coalesce(p_show_items_on_home, false))
    returning id into saved_id;
  else
    update public.collections
    set title = trim(p_title), slug = final_slug, description = nullif(trim(p_description), ''),
        price_digital_pack = p_price_digital_pack, is_published = coalesce(p_is_published, false),
        show_items_on_home = coalesce(p_show_items_on_home, false), updated_at = now()
    where id = p_collection_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Collection not found' using errcode = 'P0002'; end if;
    delete from public.collection_items where collection_id = saved_id;
  end if;

  insert into public.collection_items (collection_id, artwork_id, position)
  select saved_id, artwork_id, ordinal::smallint
  from unnest(p_artwork_ids) with ordinality as ordered(artwork_id, ordinal);

  return saved_id;
end;
$$;

create or replace function public.delete_collection(p_collection_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.studio_admins where user_id = auth.uid()) then
    raise exception 'Studio access denied' using errcode = '42501';
  end if;
  delete from public.collections where id = p_collection_id;
  if not found then raise exception 'Collection not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.save_collection(uuid, text, text, text, numeric, boolean, boolean, uuid[]) from public;
grant execute on function public.save_collection(uuid, text, text, text, numeric, boolean, boolean, uuid[]) to authenticated;
revoke all on function public.delete_collection(uuid) from public;
grant execute on function public.delete_collection(uuid) to authenticated;
