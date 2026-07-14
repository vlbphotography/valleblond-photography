-- Commandes de tirages physiques, réservées à la lecture dans le Studio.
create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public."Artworks"(id),
  paypal_order_id text not null unique,
  paypal_capture_id text unique,
  buyer_email text,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  shipping_address jsonb,
  status text not null default 'created' check (status in ('created', 'completed', 'cancelled', 'fulfilled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.print_orders enable row level security;
grant select on public.print_orders to authenticated;

drop policy if exists "Studio administrators can read print orders" on public.print_orders;
create policy "Studio administrators can read print orders"
on public.print_orders for select to authenticated
using (
  exists (
    select 1 from public.studio_admins
    where user_id = auth.uid()
  )
);
