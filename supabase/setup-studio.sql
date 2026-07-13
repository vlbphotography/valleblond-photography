-- ============================================================
-- Valleblond Photography — Sprint 1
-- Sécurité de l'accès au Studio
--
-- À exécuter dans Supabase > SQL Editor.
-- Remplacez l'adresse ci-dessous par celle du compte administrateur,
-- puis exécutez ce fichier en entier.
-- ============================================================

create table if not exists public.studio_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.studio_admins enable row level security;

-- Les visiteurs anonymes n'ont aucun droit sur cette table.
-- Les comptes connectés peuvent uniquement lire leur propre ligne grâce
-- à la politique RLS définie juste après.
revoke all on public.studio_admins from anon;
grant select on public.studio_admins to authenticated;

drop policy if exists "An administrator can read their own studio access" on public.studio_admins;

create policy "An administrator can read their own studio access"
on public.studio_admins
for select
to authenticated
using (user_id = auth.uid());

-- IMPORTANT : remplacez l'adresse avant d'exécuter ce bloc.
insert into public.studio_admins (user_id)
select id
from auth.users
where email = 'REMPLACEZ_PAR_VOTRE_EMAIL_DE_CONNEXION'
on conflict (user_id) do nothing;
