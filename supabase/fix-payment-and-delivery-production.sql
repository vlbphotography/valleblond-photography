-- Correctif production du 18 juillet 2026.
-- À exécuter dans Supabase > SQL Editor, puis cliquer sur Run.
-- Le script est idempotent : il peut être relancé sans supprimer de données.

alter table public.digital_orders
  add column if not exists immediate_delivery_consent boolean not null default false,
  add column if not exists consent_recorded_at timestamptz;

alter table public.local_delivery_requests
  add column if not exists artwork_title text,
  add column if not exists amount numeric(10,2) check (amount >= 0),
  add column if not exists currency text;

update public.local_delivery_requests as request
set
  artwork_title = coalesce(request.artwork_title, artwork.title),
  amount = coalesce(request.amount, artwork.price_physical),
  currency = coalesce(request.currency, 'EUR')
from public."Artworks" as artwork
where request.artwork_id = artwork.id
  and request.status in ('requested', 'approved', 'rejected')
  and (request.artwork_title is null or request.amount is null or request.currency is null);

-- Force PostgREST à recharger immédiatement la structure mise à jour.
notify pgrst, 'reload schema';
