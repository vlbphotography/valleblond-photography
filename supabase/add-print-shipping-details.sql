-- Ajoute le détail de livraison aux commandes de tirages physiques.
-- À exécuter une fois dans Supabase avant le prochain déploiement.

alter table public.print_orders
  add column if not exists shipping_zone text,
  add column if not exists shipping_amount numeric(10,2) not null default 0;

-- La fonction est séparée de l'ancienne afin de ne pas perturber les commandes
-- déjà enregistrées ou le cache de Supabase.
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
    completed_at = excluded.completed_at;
end;
$$;

grant execute on function public.record_print_order_with_shipping(
  uuid, text, text, text, numeric, text, jsonb, text, numeric, timestamptz
) to service_role;
