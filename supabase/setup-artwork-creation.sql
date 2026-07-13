-- ============================================================
-- Valleblond Photography — Sprint 4
-- Création atomique d'une œuvre depuis une preview
--
-- Pré-requis : setup-studio.sql et setup-preview-uploads.sql.
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- ============================================================

alter table public."Artworks"
    add column if not exists slug text,
    add column if not exists year smallint,
    add column if not exists format text,
    add column if not exists is_published boolean,
    add column if not exists preview_upload_id uuid references public.artwork_uploads(id) on delete restrict;

update public."Artworks"
set is_published = true
where is_published is null;

alter table public."Artworks"
    alter column is_published set default false,
    alter column is_published set not null;

create unique index if not exists artworks_slug_unique
on public."Artworks" (slug)
where slug is not null;

alter table public."Artworks" enable row level security;

grant select on table public."Artworks" to anon, authenticated;
grant insert, update, delete on table public."Artworks" to authenticated;

-- Une œuvre non publiée ne doit jamais être accessible via la galerie
-- ni l'API publique. Les anciennes règles de lecture sont remplacées.
do $$
declare
    existing_policy record;
begin
    for existing_policy in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'Artworks'
          and cmd in ('SELECT', 'ALL')
    loop
        execute format('drop policy if exists %I on public."Artworks"', existing_policy.policyname);
    end loop;
end;
$$;

create policy "Public can read published artworks"
on public."Artworks"
for select
to anon, authenticated
using (is_published = true);

create policy "Studio administrators can read all artworks"
on public."Artworks"
for select
to authenticated
using (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

drop policy if exists "Studio administrators can update artworks" on public."Artworks";
create policy "Studio administrators can update artworks"
on public."Artworks"
for update
to authenticated
using (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

drop policy if exists "Studio administrators can delete artworks" on public."Artworks";
create policy "Studio administrators can delete artworks"
on public."Artworks"
for delete
to authenticated
using (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

create or replace function public.create_artwork_from_upload(
    p_upload_id uuid,
    p_title text,
    p_slug text,
    p_location text,
    p_year smallint,
    p_description text,
    p_format text,
    p_price_digital numeric,
    p_price_physical numeric,
    p_is_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    selected_upload public.artwork_uploads;
    artwork_id uuid;
    slug_base text;
    final_slug text;
    slug_index integer := 2;
begin
    if not exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    ) then
        raise exception 'Studio access denied' using errcode = '42501';
    end if;

    select *
    into selected_upload
    from public.artwork_uploads
    where id = p_upload_id
      and status = 'pending'
    for update;

    if not found then
        raise exception 'Preview not found or already attached' using errcode = 'P0002';
    end if;

    if length(trim(p_title)) = 0 then
        raise exception 'Artwork title is required' using errcode = '22023';
    end if;

    slug_base := nullif(trim(p_slug), '');
    final_slug := slug_base;

    while final_slug is not null and exists (
        select 1
        from public."Artworks"
        where slug = final_slug
    ) loop
        final_slug := slug_base || '-' || slug_index;
        slug_index := slug_index + 1;
    end loop;

    insert into public."Artworks" (
        title,
        slug,
        location,
        year,
        description,
        format,
        price_digital,
        price_physical,
        image_url,
        preview_upload_id,
        is_published
    )
    values (
        trim(p_title),
        final_slug,
        nullif(trim(p_location), ''),
        p_year,
        nullif(trim(p_description), ''),
        nullif(trim(p_format), ''),
        p_price_digital,
        p_price_physical,
        'https://wanwxjzfxlxunynnmxia.supabase.co/storage/v1/object/public/artworks/' || selected_upload.storage_path,
        selected_upload.id,
        coalesce(p_is_published, false)
    )
    returning id into artwork_id;

    update public.artwork_uploads
    set status = 'attached'
    where id = selected_upload.id;

    return artwork_id;
end;
$$;

revoke all on function public.create_artwork_from_upload(uuid, text, text, text, smallint, text, text, numeric, numeric, boolean) from public;
grant execute on function public.create_artwork_from_upload(uuid, text, text, text, smallint, text, text, numeric, numeric, boolean) to authenticated;
