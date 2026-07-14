-- Enregistre l'accord explicite demandé avant la fourniture immédiate d'un fichier numérique.
-- À exécuter une fois dans Supabase avant le prochain déploiement du parcours numérique.

alter table public.digital_orders
  add column if not exists immediate_delivery_consent boolean not null default false,
  add column if not exists consent_recorded_at timestamptz;
