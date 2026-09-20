-- Feiraê core marketplace schema
create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.app_role as enum ('customer','vendor','delivery','admin','fair_manager');
create type public.order_status as enum ('pending_payment','paid','accepted','preparing','ready_for_pickup','out_for_delivery','delivered','canceled','refunded');
create type public.fulfillment_type as enum ('delivery','pickup');

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text,
 role public.app_role not null default 'customer',
 created_at timestamptz not null default now()
);
create table if not exists public.fairs (
 id uuid primary key default gen_random_uuid(),
 name text not null, description text, address text not null,
 location geography(point,4326),
 is_active boolean not null default true,
 opening_hours jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.vendor_profiles (
 id uuid primary key references public.profiles(id) on delete cascade,
 business_name text not null, description text,
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.fair_vendor_memberships (
 fair_id uuid references public.fairs(id) on delete cascade,
 vendor_id uuid references public.vendor_profiles(id) on delete cascade,
 stall_location geography(point,4326),
 active boolean not null default true,
 primary key (fair_id,vendor_id)
);
create table if not exists public.vendor_stores (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
 name text not null, description text,
 is_open boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique, active boolean not null default true
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
 store_id uuid references public.vendor_stores(id) on delete set null,
 category_id uuid references public.categories(id) on delete set null,
 name text not null, description text,
 price numeric(12,2) not null check (price >= 0),
 unit text not null default 'un',
 stock numeric(12,3) not null default 0 check (stock >= 0),
 available boolean not null default true,
 promotion_price numeric(12,2),
 created_at timestamptz not null default now()
);
create table if not exists public.addresses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 label text, recipient_name text, address_line text not null,
 number text, complement text, neighborhood text,
 city text not null, state text not null default 'DF',
 postal_code text, location geography(point,4326),
 is_default boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.profiles(id),
 address_id uuid references public.addresses(id),
 fulfillment public.fulfillment_type not null,
 status public.order_status not null default 'pending_payment',
 subtotal numeric(12,2) not null default 0,
 delivery_fee numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.order_vendors (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 vendor_id uuid not null references public.vendor_profiles(id),
 status public.order_status not null default 'pending_payment',
 subtotal numeric(12,2) not null default 0,
 unique(order_id,vendor_id)
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 order_vendor_id uuid not null references public.order_vendors(id) on delete cascade,
 product_id uuid not null references public.products(id),
 product_name_snapshot text not null,
 unit_price_snapshot numeric(12,2) not null,
 quantity numeric(12,3) not null check (quantity > 0),
 total numeric(12,2) not null
);
create table if not exists public.carts (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null unique references public.profiles(id) on delete cascade,
 updated_at timestamptz not null default now()
);
create table if not exists public.cart_items (
 id uuid primary key default gen_random_uuid(),
 cart_id uuid not null references public.carts(id) on delete cascade,
 product_id uuid not null references public.products(id),
 quantity numeric(12,3) not null check (quantity > 0),
 unique(cart_id,product_id)
);
create table if not exists public.deliveries (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id) on delete cascade,
 delivery_id uuid references public.profiles(id),
 status text not null default 'pending',
 pickup_location geography(point,4326),
 dropoff_location geography(point,4326),
 fee numeric(12,2) not null default 0,
 proof_url text,
 accepted_at timestamptz,
 delivered_at timestamptz
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 provider text, provider_payment_id text, method text,
 status text not null default 'pending',
 amount numeric(12,2) not null,
 commission numeric(12,2) not null default 0,
 vendor_amount numeric(12,2) not null default 0,
 delivery_amount numeric(12,2) not null default 0,
 created_at timestamptz not null default now(),
 unique(provider,provider_payment_id)
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 customer_id uuid not null references public.profiles(id),
 vendor_id uuid references public.vendor_profiles(id),
 rating integer not null check (rating between 1 and 5),
 comment text, created_at timestamptz not null default now()
);

create index if not exists fairs_location_gix on public.fairs using gist(location);
create index if not exists addresses_location_gix on public.addresses using gist(location);
create index if not exists products_vendor_idx on public.products(vendor_id);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.profiles enable row level security;
alter table public.fairs enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;

create policy "public can view active fairs" on public.fairs for select using (is_active = true);
create policy "public can view available products" on public.products for select using (available = true);
create policy "users manage own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "users manage own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "customers view own orders" on public.orders for select using (customer_id = auth.uid());
create policy "customers manage own cart items" on public.cart_items for all using (
 exists (select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid())
) with check (
 exists (select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid())
);

-- Order, stock and financial mutations must be validated server-side.
