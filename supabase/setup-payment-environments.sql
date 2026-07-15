-- ============================================================
-- Valleblond Photography — Isolation PayPal Sandbox / Live
--
-- À exécuter une seule fois dans Supabase > SQL Editor, AVANT
-- le déploiement qui active ce fichier.
--
-- Le registre comptable ne retient que les transactions PayPal Live.
-- Les commandes antérieures sans environnement restent volontairement
-- exclues, sauf les anciens tests Sandbox identifiés ci-dessous.
-- ============================================================

alter table public.digital_orders
  add column if not exists paypal_environment text
  check (paypal_environment in ('sandbox', 'live'));

alter table public.print_orders
  add column if not exists paypal_environment text
  check (paypal_environment in ('sandbox', 'live'));

-- Les comptes acheteurs Sandbox PayPal utilisent ce format. Ces lignes sont
-- des tests et ne doivent jamais être comptabilisées comme des recettes.
update public.digital_orders
set paypal_environment = 'sandbox'
where paypal_environment is null
  and buyer_email ~* '^sb-.*@personal[.]example[.]com$';

update public.print_orders
set paypal_environment = 'sandbox'
where paypal_environment is null
  and buyer_email ~* '^sb-.*@personal[.]example[.]com$';

-- La fonction enregistre maintenant l’environnement de paiement avec chaque
-- tirage. Elle est séparée de l’ancienne signature pour éviter toute ambiguïté
-- dans le cache de Supabase.
create or replace function public.record_print_order_with_shipping(
  p_artwork_id uuid,
  p_paypal_order_id text,
  p_paypal_capture_id text,
  p_buyer_email text,
  p_amount numeric,
  p_currency text,
  p_shipping_address jsonb,
  p_shipping_zone text,
  p_shipping_amount numeric,
  p_paypal_environment text,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.print_orders (
    artwork_id,
    paypal_order_id,
    paypal_capture_id,
    buyer_email,
    amount,
    currency,
    status,
    shipping_address,
    shipping_zone,
    shipping_amount,
    paypal_environment,
    completed_at
  ) values (
    p_artwork_id,
    p_paypal_order_id,
    p_paypal_capture_id,
    p_buyer_email,
    p_amount,
    p_currency,
    'completed',
    p_shipping_address,
    p_shipping_zone,
    p_shipping_amount,
    p_paypal_environment,
    p_completed_at
  )
  on conflict (paypal_order_id) do update set
    paypal_capture_id = excluded.paypal_capture_id,
    buyer_email = excluded.buyer_email,
    amount = excluded.amount,
    currency = excluded.currency,
    status = excluded.status,
    shipping_address = excluded.shipping_address,
    shipping_zone = excluded.shipping_zone,
    shipping_amount = excluded.shipping_amount,
    paypal_environment = excluded.paypal_environment,
    completed_at = excluded.completed_at;
end;
$$;

grant execute on function public.record_print_order_with_shipping(
  uuid, text, text, text, numeric, text, jsonb, text, numeric, text, timestamptz
) to service_role;
