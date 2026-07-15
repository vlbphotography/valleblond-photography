-- ============================================================
-- Valleblond Photography — Comptabilité Studio
--
-- À exécuter une seule fois dans Supabase > SQL Editor.
--
-- Cette migration complète les demandes de livraison locale avec
-- un instantané du prix et du titre. Le registre comptable du Studio
-- peut alors exporter les paiements encaissés sans dépendre du prix
-- actuel de l’œuvre.
-- ============================================================

alter table public.local_delivery_requests
  add column if not exists artwork_title text,
  add column if not exists amount numeric(10,2) check (amount >= 0),
  add column if not exists currency text;

-- Les demandes en cours n’ayant jamais été réglées peuvent recevoir
-- l’instantané du catalogue actuel. Les ventes déjà réglées ne sont pas
-- modifiées : leur montant historique ne doit jamais être deviné.
update public.local_delivery_requests as request
set
  artwork_title = coalesce(request.artwork_title, artwork.title),
  amount = coalesce(request.amount, artwork.price_physical),
  currency = coalesce(request.currency, 'EUR')
from public."Artworks" as artwork
where request.artwork_id = artwork.id
  and request.status in ('requested', 'approved', 'rejected')
  and (request.artwork_title is null or request.amount is null or request.currency is null);

comment on column public.local_delivery_requests.artwork_title is
  'Titre figé lors de la demande locale, utilisé pour le registre comptable.';

comment on column public.local_delivery_requests.amount is
  'Montant total figé lors de la demande locale, hors livraison offerte.';

comment on column public.local_delivery_requests.currency is
  'Devise du montant figé lors de la demande locale.';
