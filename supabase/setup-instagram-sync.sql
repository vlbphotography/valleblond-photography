-- ============================================================
-- Valleblond Photography — Synchronisation Instagram
-- À exécuter une seule fois dans Supabase > SQL Editor.
--
-- Les jetons Meta sont accessibles uniquement aux fonctions Netlify
-- via la clé service_role. Ils ne sont jamais lisibles dans le Studio.
-- ============================================================

create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  studio_user_id uuid not null unique references auth.users(id) on delete cascade,
  instagram_account_id text not null unique,
  instagram_username text,
  -- Conservé nullable : la connexion Instagram directe ne nécessite pas de
  -- Page Facebook, contrairement à l'ancienne API Facebook Login.
  facebook_page_id text,
  facebook_page_name text,
  page_access_token text not null,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- États OAuth à durée de vie courte. Ils empêchent qu'une autorisation Meta
-- soit utilisée par une autre session que celle qui l'a initiée.
create table if not exists public.instagram_oauth_states (
  state text primary key,
  studio_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public."Artworks"
  add column if not exists instagram_media_id text unique,
  add column if not exists instagram_permalink text,
  add column if not exists instagram_imported_at timestamptz;

alter table public.collections
  add column if not exists instagram_media_id text unique,
  add column if not exists instagram_permalink text,
  add column if not exists instagram_imported_at timestamptz;

create index if not exists artworks_instagram_media_id_index
  on public."Artworks" (instagram_media_id)
  where instagram_media_id is not null;

create index if not exists collections_instagram_media_id_index
  on public.collections (instagram_media_id)
  where instagram_media_id is not null;

alter table public.instagram_connections enable row level security;
alter table public.instagram_oauth_states enable row level security;

-- Aucun accès direct depuis le navigateur : ni les jetons ni les états OAuth
-- ne peuvent être sélectionnés avec la clé publique Supabase.
revoke all on table public.instagram_connections from anon, authenticated;
revoke all on table public.instagram_oauth_states from anon, authenticated;
