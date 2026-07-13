-- ============================================================
-- Valleblond Photography — Sprint 3
-- Upload sécurisé des previews depuis le Studio
--
-- Pré-requis : le bucket public "artworks" existe déjà.
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- ============================================================

create table if not exists public.artwork_uploads (
    id uuid primary key default gen_random_uuid(),
    storage_path text not null unique,
    original_name text not null,
    mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
    file_size_bytes bigint not null check (file_size_bytes > 0),
    status text not null default 'pending' check (status in ('pending', 'attached')),
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now()
);

alter table public.artwork_uploads enable row level security;

grant select, insert, delete on table public.artwork_uploads to authenticated;

drop policy if exists "Studio administrators can read preview uploads" on public.artwork_uploads;
create policy "Studio administrators can read preview uploads"
on public.artwork_uploads
for select
to authenticated
using (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

drop policy if exists "Studio administrators can create preview uploads" on public.artwork_uploads;
create policy "Studio administrators can create preview uploads"
on public.artwork_uploads
for insert
to authenticated
with check (
    created_by = auth.uid()
    and exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

drop policy if exists "Studio administrators can delete preview uploads" on public.artwork_uploads;
create policy "Studio administrators can delete preview uploads"
on public.artwork_uploads
for delete
to authenticated
using (
    exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

-- Les fichiers de preview sont rangés sous artworks/previews/.
-- Les autres dossiers (notamment les fichiers HD futurs) restent hors
-- de cette autorisation.
drop policy if exists "Studio administrators can upload artwork previews" on storage.objects;
create policy "Studio administrators can upload artwork previews"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = 'previews'
    and exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);

drop policy if exists "Studio administrators can delete artwork previews" on storage.objects;
create policy "Studio administrators can delete artwork previews"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = 'previews'
    and exists (
        select 1
        from public.studio_admins
        where user_id = auth.uid()
    )
);
