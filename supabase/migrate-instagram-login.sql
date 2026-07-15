-- ============================================================
-- Valleblond Photography — Migration vers Instagram Login
-- À exécuter car setup-instagram-sync.sql a déjà été lancé.
--
-- L'API Instagram moderne autorise directement le compte professionnel ;
-- une Page Facebook n'est donc plus obligatoire.
-- ============================================================

alter table public.instagram_connections
  alter column facebook_page_id drop not null;

