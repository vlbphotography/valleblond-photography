-- ============================================================
-- Valleblond Photography — Sprint 6
-- Suppression contrôlée d'une œuvre
--
-- Pré-requis : setup-artwork-editing.sql.
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- ============================================================

alter table public.artwork_uploads
    drop constraint if exists artwork_uploads_status_check;

alter table public.artwork_uploads
    add constraint artwork_uploads_status_check
    check (status in ('pending', 'attached', 'orphaned'));

create or replace function public.delete_artwork(p_artwork_id uuid)
returns table (
    upload_id uuid,
    storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    artwork_upload uuid;
    uploaded_file_path text;
begin
    if not exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    ) then
        raise exception 'Studio access denied' using errcode = '42501';
    end if;

    select preview_upload_id
    into artwork_upload
    from public."Artworks"
    where id = p_artwork_id
    for update;

    if not found then
        raise exception 'Artwork not found' using errcode = 'P0002';
    end if;

    if artwork_upload is not null then
        select path.storage_path
        into uploaded_file_path
        from public.artwork_uploads as path
        where id = artwork_upload
        for update;

        update public.artwork_uploads
        set status = 'orphaned'
        where id = artwork_upload;
    end if;

    delete from public."Artworks"
    where id = p_artwork_id;

    return query select artwork_upload, uploaded_file_path;
end;
$$;

revoke all on function public.delete_artwork(uuid) from public;
grant execute on function public.delete_artwork(uuid) to authenticated;
