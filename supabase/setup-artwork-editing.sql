-- ============================================================
-- Valleblond Photography — Sprint 5
-- Modification atomique d'une œuvre
--
-- Pré-requis : setup-artwork-creation.sql.
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- ============================================================

create or replace function public.update_artwork(
    p_artwork_id uuid,
    p_title text,
    p_slug text,
    p_location text,
    p_year smallint,
    p_description text,
    p_format text,
    p_price_digital numeric,
    p_price_physical numeric,
    p_is_published boolean,
    p_replacement_upload_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    replacement_upload public.artwork_uploads;
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

    if not exists (
        select 1
        from public."Artworks"
        where id = p_artwork_id
    ) then
        raise exception 'Artwork not found' using errcode = 'P0002';
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
          and id <> p_artwork_id
    ) loop
        final_slug := slug_base || '-' || slug_index;
        slug_index := slug_index + 1;
    end loop;

    if p_replacement_upload_id is not null then
        select *
        into replacement_upload
        from public.artwork_uploads
        where id = p_replacement_upload_id
          and status = 'pending'
        for update;

        if not found then
            raise exception 'Replacement preview not found or already attached' using errcode = 'P0002';
        end if;

        update public.artwork_uploads
        set status = 'attached'
        where id = replacement_upload.id;
    end if;

    update public."Artworks"
    set
        title = trim(p_title),
        slug = final_slug,
        location = nullif(trim(p_location), ''),
        year = p_year,
        description = nullif(trim(p_description), ''),
        format = nullif(trim(p_format), ''),
        price_digital = p_price_digital,
        price_physical = p_price_physical,
        is_published = coalesce(p_is_published, false),
        image_url = case
            when p_replacement_upload_id is null then image_url
            else 'https://wanwxjzfxlxunynnmxia.supabase.co/storage/v1/object/public/artworks/' || replacement_upload.storage_path
        end,
        preview_upload_id = coalesce(p_replacement_upload_id, preview_upload_id)
    where id = p_artwork_id;

    return p_artwork_id;
end;
$$;

revoke all on function public.update_artwork(uuid, text, text, text, smallint, text, text, numeric, numeric, boolean, uuid) from public;
grant execute on function public.update_artwork(uuid, text, text, text, smallint, text, text, numeric, numeric, boolean, uuid) to authenticated;
