-- Valleblond Photography — Droits serveur nécessaires à la synchronisation Instagram
--
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Les visiteurs n'obtiennent aucun accès par cette requête : ces droits sont
-- réservés aux fonctions Netlify, via la clé serveur stockée dans Netlify.

grant usage on schema public to service_role;

grant select on public.studio_admins to service_role;

grant select, insert, update, delete on public.instagram_connections to service_role;
grant select, insert, update, delete on public.instagram_oauth_states to service_role;

grant select, insert, update on public."Artworks" to service_role;
grant select, insert, update on public.collections to service_role;
grant select, insert, update on public.collection_items to service_role;
