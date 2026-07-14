-- ============================================================
-- Valleblond Photography — Demandes de livraison locale
--
-- À exécuter une seule fois dans Supabase > SQL Editor, avant
-- le déploiement qui active cette fonctionnalité.
--
-- Le visiteur ne peut jamais lire ces demandes. Il les dépose via
-- une fonction Netlify, puis seul le compte Studio peut les traiter.
-- ============================================================

create table if not exists public.local_delivery_requests (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public."Artworks"(id) on delete restrict,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  address_line text not null,
  postal_code text not null,
  city text not null,
  payment_preference text not null default 'pay_on_delivery'
    check (payment_preference in ('pay_on_delivery', 'paypal_after_approval')),
  payment_method text
    check (payment_method in ('pay_on_delivery', 'paypal_after_approval')),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'paid_in_person', 'delivered')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  delivered_at timestamptz
);

alter table public.local_delivery_requests enable row level security;

revoke all on public.local_delivery_requests from anon;
grant select on public.local_delivery_requests to authenticated;

drop policy if exists "Studio administrators can read local delivery requests" on public.local_delivery_requests;

create policy "Studio administrators can read local delivery requests"
on public.local_delivery_requests
for select
to authenticated
using (
  exists (
    select 1 from public.studio_admins where user_id = auth.uid()
  )
);

-- Les transitions sont volontairement limitées : l'interface Studio ne peut
-- pas modifier une commande arbitrairement ni marquer un paiement à distance
-- comme un paiement reçu en main propre.
create or replace function public.process_local_delivery_request(
  p_request_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.studio_admins where user_id = auth.uid()
  ) then
    raise exception 'Studio access denied' using errcode = '42501';
  end if;

  if p_action = 'approve' then
    update public.local_delivery_requests
    set status = 'approved',
        payment_method = payment_preference,
        approved_at = coalesce(approved_at, now())
    where id = p_request_id and status = 'requested';
  elsif p_action = 'reject' then
    update public.local_delivery_requests
    set status = 'rejected'
    where id = p_request_id and status = 'requested';
  elsif p_action = 'mark_paid_in_person' then
    update public.local_delivery_requests
    set status = 'paid_in_person',
        payment_method = 'pay_on_delivery',
        paid_at = coalesce(paid_at, now())
    where id = p_request_id and status = 'approved';
  elsif p_action = 'mark_delivered' then
    update public.local_delivery_requests
    set status = 'delivered',
        delivered_at = coalesce(delivered_at, now())
    where id = p_request_id and status = 'paid_in_person';
  else
    raise exception 'Unknown local delivery action' using errcode = '22023';
  end if;

  if not found then
    raise exception 'This action is not available for this request' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.process_local_delivery_request(uuid, text) from public;
grant execute on function public.process_local_delivery_request(uuid, text) to authenticated;
