-- ============================================================
-- Valleblond Photography — Sprint 2
-- Lecture du catalogue depuis le Studio
--
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Cette règle n'élargit pas l'accès public : la galerie est déjà
-- consultable anonymement. Elle permet au compte connecté du Studio
-- de lire ce même catalogue pour afficher le dashboard.
-- ============================================================

grant select on table public."Artworks" to authenticated;

drop policy if exists "Authenticated users can read artworks" on public."Artworks";

create policy "Authenticated users can read artworks"
on public."Artworks"
for select
to authenticated
using (true);
