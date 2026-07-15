create table if not exists public.digital_orders (
 id uuid primary key default gen_random_uuid(),
 artwork_id uuid not null references public."Artworks"(id),
 paypal_order_id text not null unique,
 paypal_capture_id text unique,
 buyer_email text,
 amount numeric(10,2) not null check (amount >= 0),
 currency text not null default 'EUR',
 paypal_environment text check (paypal_environment in ('sandbox', 'live')),
 status text not null default 'created' check (status in ('created','completed','failed')),
 download_count integer not null default 0,
 created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.digital_orders enable row level security;
