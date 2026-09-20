-- Regional experience, live engagement/commerce and currency-safe accounting.
-- Money is always persisted with its ISO currency. FX rates are snapshots used
-- for display/payout quotes; they never rewrite the original ledger amount.

alter table public.app_content_settings
  add column if not exists default_locale text not null default 'pt-BR',
  add column if not exists supported_locales text[] not null default array['pt-BR','en-US'],
  add column if not exists default_country text not null default 'BR',
  add column if not exists default_currency text not null default 'BRL',
  add column if not exists tip_presets jsonb not null default '{"BRL":[5,10,20,50,100],"USD":[5,10,20,50,100]}'::jsonb,
  add column if not exists fx_rates jsonb not null default '{"BRL":1,"USD":5.30}'::jsonb,
  add column if not exists live_likes_enabled boolean not null default true,
  add column if not exists live_comments_enabled boolean not null default true,
  add column if not exists live_sharing_enabled boolean not null default true,
  add column if not exists live_offers_enabled boolean not null default true,
  add column if not exists video_watermark_enabled boolean not null default true,
  add column if not exists live_watermark_enabled boolean not null default true,
  add column if not exists google_login_enabled boolean not null default true;

alter table public.profiles
  alter column birth_date drop not null,
  add column if not exists locale text not null default 'pt-BR',
  add column if not exists country_code text not null default 'BR',
  add column if not exists preferred_currency text not null default 'BRL',
  add column if not exists onboarding_completed boolean not null default true;

-- Google does not return a birth date. Create a deliberately unverified,
-- incomplete profile and keep age-protected access closed until onboarding.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  requested_role text:=coalesce(new.raw_user_meta_data->>'requested_role','user');
  safe_role text:=case when requested_role='creator' then 'creator' else 'user' end;
  birth date:=nullif(new.raw_user_meta_data->>'birth_date','')::date;
  auth_provider text:=coalesce(new.raw_app_meta_data->>'provider','email');
  base_username text:=coalesce(nullif(new.raw_user_meta_data->>'username',''),split_part(new.email,'@',1),'member');
  safe_username text;
  display_name text:=coalesce(nullif(new.raw_user_meta_data->>'name',''),nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1),'Membro Velvet');
begin
  if birth is null and auth_provider<>'google' then raise exception 'birth_date_required'; end if;
  if birth is not null and extract(year from age(current_date,birth))<18 then raise exception 'User must be at least 18 years old'; end if;
  safe_username:=case when auth_provider='google' then left(regexp_replace(lower(base_username),'[^a-z0-9_]','','g'),20)||'_'||substr(new.id::text,1,6) else base_username end;
  insert into public.profiles(id,username,name,avatar_url,birth_date,role,age_verified,age_verified_at,onboarding_completed)
  values(new.id,safe_username,display_name,coalesce(new.raw_user_meta_data->>'avatar_url',''),birth,safe_role,false,null,birth is not null);
  if safe_role='creator' then
    insert into public.creators(user_id,display_name,handle,avatar_url,is_approved)
    values(new.id,display_name,safe_username,coalesce(nullif(new.raw_user_meta_data->>'avatar_url',''),'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop'),false);
  end if;
  return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

alter table public.creators
  add column if not exists payout_country text not null default 'BR',
  add column if not exists payout_currency text not null default 'BRL';

alter table public.live_sessions
  add column if not exists viewer_count integer not null default 0 check (viewer_count >= 0),
  add column if not exists likes_count integer not null default 0 check (likes_count >= 0),
  add column if not exists comments_count integer not null default 0 check (comments_count >= 0),
  add column if not exists shares_count integer not null default 0 check (shares_count >= 0),
  add column if not exists watermark_enabled boolean not null default true;

alter table public.checkout_sessions add column if not exists currency text not null default 'BRL';
alter table public.creator_tips add column if not exists currency text not null default 'BRL';
alter table public.financial_transactions add column if not exists currency text not null default 'BRL';
alter table public.withdrawals
  add column if not exists source_currency text not null default 'BRL',
  add column if not exists payout_currency text not null default 'BRL',
  add column if not exists payout_amount numeric(14,2),
  add column if not exists exchange_rate numeric(18,8) not null default 1 check (exchange_rate > 0),
  add column if not exists payout_country text not null default 'BR';

create table if not exists public.live_likes (
  id uuid primary key default uuid_generate_v4(),
  live_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(live_id,user_id)
);
alter table public.live_likes enable row level security;
create policy "live likes readable" on public.live_likes for select to authenticated using (true);
create policy "live like insert own" on public.live_likes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "live like delete own" on public.live_likes for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.live_comments (
  id uuid primary key default uuid_generate_v4(),
  live_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  moderation_status text not null default 'approved' check (moderation_status in ('pending','approved','rejected','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_comments enable row level security;
create policy "approved live comments readable" on public.live_comments for select to authenticated
  using (moderation_status='approved' or (select auth.uid())=user_id or public.is_admin());
create policy "live comment insert own" on public.live_comments for insert to authenticated
  with check ((select auth.uid())=user_id and moderation_status='approved');
create policy "live comment delete own or admin" on public.live_comments for delete to authenticated
  using ((select auth.uid())=user_id or public.is_admin());

create table if not exists public.live_shares (
  id uuid primary key default uuid_generate_v4(),
  live_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'copy_link' check (channel in ('copy_link','native','whatsapp','other')),
  created_at timestamptz not null default now()
);
alter table public.live_shares enable row level security;
create policy "live share insert" on public.live_shares for insert to authenticated
  with check ((select auth.uid())=user_id);
create policy "live share own or creator" on public.live_shares for select to authenticated
  using ((select auth.uid())=user_id or exists(select 1 from public.live_sessions l join public.creators c on c.id=l.creator_id where l.id=live_id and c.user_id=(select auth.uid())) or public.is_admin());

create table if not exists public.live_offers (
  id uuid primary key default uuid_generate_v4(),
  live_id uuid not null references public.live_sessions(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 500),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BRL' check (currency in ('BRL','USD')),
  status text not null default 'active' check (status in ('draft','active','paused','sold_out','ended')),
  max_orders integer check (max_orders is null or max_orders > 0),
  orders_count integer not null default 0 check (orders_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_offers enable row level security;
create policy "active live offers readable" on public.live_offers for select to authenticated
  using (status='active' or exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin());
create policy "creator inserts live offer" on public.live_offers for insert to authenticated
  with check (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid()) and c.is_approved=true)
    and exists(select 1 from public.live_sessions l where l.id=live_id and l.creator_id=creator_id));
create policy "creator updates live offer" on public.live_offers for update to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin())
  with check (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin());

create table if not exists public.live_offer_orders (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.live_offers(id) on delete restrict,
  live_id uuid not null references public.live_sessions(id) on delete restrict,
  creator_id uuid not null references public.creators(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  checkout_session_id uuid unique references public.checkout_sessions(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BRL',
  status text not null default 'paid' check (status in ('paid','accepted','fulfilled','cancelled','refunded')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_offer_orders enable row level security;
create policy "live order participants read" on public.live_offer_orders for select to authenticated
  using ((select auth.uid())=buyer_id or exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin());
create policy "creator updates live order" on public.live_offer_orders for update to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin())
  with check (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=(select auth.uid())) or public.is_admin());

create index if not exists live_comments_live_created_idx on public.live_comments(live_id,created_at desc);
create index if not exists live_offers_live_status_idx on public.live_offers(live_id,status,created_at desc);
create index if not exists live_offer_orders_creator_status_idx on public.live_offer_orders(creator_id,status,created_at desc);

alter table public.checkout_sessions drop constraint if exists checkout_sessions_kind_check;
alter table public.checkout_sessions add constraint checkout_sessions_kind_check
  check (kind in ('platform_plan','creator_plan','tip','pay_per_view','live_solo','live_offer'));

create or replace function public.refresh_live_comment_count()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.live_sessions set comments_count=(select count(*) from public.live_comments where live_id=coalesce(new.live_id,old.live_id) and moderation_status='approved')
  where id=coalesce(new.live_id,old.live_id);
  return coalesce(new,old);
end $$;
drop trigger if exists refresh_live_comment_count on public.live_comments;
create trigger refresh_live_comment_count after insert or update of moderation_status or delete on public.live_comments
for each row execute function public.refresh_live_comment_count();
revoke all on function public.refresh_live_comment_count() from public,anon,authenticated;

create or replace function public.toggle_live_like(p_live_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare uid uuid := auth.uid(); liked boolean;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.live_sessions where id=p_live_id and moderation_status='approved') then raise exception 'live_not_found'; end if;
  delete from public.live_likes where live_id=p_live_id and user_id=uid;
  if found then liked:=false; else insert into public.live_likes(live_id,user_id) values(p_live_id,uid); liked:=true; end if;
  update public.live_sessions set likes_count=(select count(*) from public.live_likes where live_id=p_live_id) where id=p_live_id;
  return liked;
end $$;
revoke all on function public.toggle_live_like(uuid) from public,anon;
grant execute on function public.toggle_live_like(uuid) to authenticated;

create or replace function public.record_live_share(p_live_id uuid,p_channel text default 'copy_link')
returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  insert into public.live_shares(live_id,user_id,channel) values(p_live_id,uid,case when p_channel in ('copy_link','native','whatsapp','other') then p_channel else 'other' end);
  update public.live_sessions set shares_count=shares_count+1 where id=p_live_id;
end $$;
revoke all on function public.record_live_share(uuid,text) from public,anon;
grant execute on function public.record_live_share(uuid,text) to authenticated;

-- Extends the hardened atomic settlement without weakening the existing flow.
-- Standard checkouts are delegated to settle_verified_payment; live commerce is
-- committed atomically here after the same provider integrity checks.
alter function public.settle_verified_payment(jsonb) rename to settle_verified_payment_core;
revoke all on function public.settle_verified_payment_core(jsonb) from public,anon,authenticated;
grant execute on function public.settle_verified_payment_core(jsonb) to service_role;

create or replace function public.settle_verified_payment(p_payment jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare
  s public.checkout_sessions%rowtype; payment_id text:=p_payment->>'id'; provider_status text:=p_payment->>'status';
  event_key text; previous_event text; creator_id uuid; share numeric; net numeric; transaction_kind text;
  offer public.live_offers%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only'; end if;
  if payment_id is null or payment_id !~ '^[0-9]+$' then raise exception 'invalid_payment_id'; end if;
  select * into s from public.checkout_sessions where id=(p_payment->>'external_reference')::uuid for update;
  if not found then raise exception 'checkout_not_found'; end if;
  if s.kind not in ('live_solo','live_offer') then return public.settle_verified_payment_core(p_payment); end if;
  if s.gateway<>'mercadopago' or p_payment->>'currency_id' is distinct from 'BRL'
     or (p_payment->>'transaction_amount')::numeric is distinct from s.amount or s.currency<>'BRL' then
    raise exception 'payment_integrity_failed';
  end if;
  event_key:=payment_id||':'||provider_status;
  select status into previous_event from public.payment_events where gateway='mercadopago' and gateway_event_id=event_key;
  if previous_event in ('processed','ignored') then return jsonb_build_object('ok',true,'duplicate',true); end if;
  if s.metadata->>'settled_payment_id' is not null and s.metadata->>'settled_payment_id'<>payment_id then raise exception 'checkout_already_settled'; end if;
  insert into public.payment_events(gateway,gateway_event_id,payment_id,event_type,status,payload)
    values('mercadopago',event_key,payment_id,'payment','received',jsonb_build_object('status',provider_status,'checkout_session_id',s.id))
    on conflict(gateway,gateway_event_id) do update set status='received';
  creator_id:=(s.metadata->>'creator_id')::uuid;
  select tip_share_percent into share from public.creators where id=creator_id;
  if creator_id is null or share is null or share<0 or share>100 then raise exception 'invalid_creator_share'; end if;

  if provider_status in ('refunded','charged_back') then
    perform public.reverse_creator_credit(creator_id,'mercadopago',payment_id);
    if s.kind='live_solo' then update public.live_solo_requests set status='refunded' where payment_gateway_id=payment_id;
    else update public.live_offer_orders set status='refunded',updated_at=now() where checkout_session_id=s.id; end if;
    update public.financial_transactions set state=case when provider_status='charged_back' then 'chargeback' else 'refunded' end,updated_at=now()
      where provider='mercadopago' and provider_reference=payment_id;
    update public.checkout_sessions set status='refunded',metadata=metadata||jsonb_build_object('settled_payment_id',payment_id),updated_at=now() where id=s.id;
  elsif provider_status='approved' then
    net:=round(s.amount*share/100,2);
    if s.kind='live_solo' then
      insert into public.live_solo_requests(live_id,requester_id,creator_id,amount,status,payment_gateway_id)
        values(s.reference_id,s.user_id,creator_id,s.amount,'paid',payment_id) on conflict(payment_gateway_id) do nothing;
      transaction_kind:='live_solo';
    else
      select * into offer from public.live_offers where id=s.reference_id for update;
      if not found or offer.creator_id<>creator_id or offer.status<>'active' or offer.currency<>'BRL' or offer.amount<>s.amount then raise exception 'live_offer_unavailable'; end if;
      if offer.max_orders is not null and offer.orders_count>=offer.max_orders then raise exception 'live_offer_sold_out'; end if;
      insert into public.live_offer_orders(offer_id,live_id,creator_id,buyer_id,checkout_session_id,amount,currency,status,note)
        values(offer.id,offer.live_id,creator_id,s.user_id,s.id,s.amount,'BRL','paid',coalesce(s.metadata->>'note',''))
        on conflict(checkout_session_id) do nothing;
      update public.live_offers set orders_count=orders_count+1,status=case when max_orders is not null and orders_count+1>=max_orders then 'sold_out' else status end,updated_at=now() where id=offer.id;
      transaction_kind:='live_offer';
    end if;
    perform public.credit_creator(creator_id,s.amount,payment_id,jsonb_build_object('provider','mercadopago','kind',transaction_kind,'checkout_session_id',s.id,'share_percent',share,'currency','BRL'));
    insert into public.financial_transactions(user_id,creator_id,checkout_session_id,kind,gross_amount,creator_amount,platform_amount,state,provider,provider_reference,currency)
      values(s.user_id,creator_id,s.id,transaction_kind,s.amount,net,s.amount-net,'available','mercadopago',payment_id,'BRL')
      on conflict(provider,provider_reference) do nothing;
    update public.checkout_sessions set status='paid',metadata=metadata||jsonb_build_object('settled_payment_id',payment_id),updated_at=now() where id=s.id;
  elsif s.status<>'paid' then
    update public.checkout_sessions set status=case provider_status when 'rejected' then 'failed' when 'cancelled' then 'cancelled' else 'pending' end,updated_at=now() where id=s.id;
  end if;
  update public.payment_events set status='processed',processed_at=now() where gateway='mercadopago' and gateway_event_id=event_key;
  return jsonb_build_object('ok',true,'status',provider_status);
end $$;
revoke all on function public.settle_verified_payment(jsonb) from public,anon,authenticated;
grant execute on function public.settle_verified_payment(jsonb) to service_role;

-- Currency-aware payout quote. The debited balance remains BRL while the payout
-- amount and FX snapshot are immutable audit fields on the withdrawal.
create or replace function public.request_creator_withdrawal_regional(
  p_amount_brl numeric, p_destination text, p_destination_type text, p_payout_currency text, p_country text
) returns uuid language plpgsql security definer set search_path='public','private' as $$
declare uid uuid := auth.uid(); creator public.creators%rowtype; min_value numeric; rate numeric; wid uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_payout_currency not in ('BRL','USD') then raise exception 'unsupported_payout_currency'; end if;
  select * into creator from public.creators where user_id=uid and is_approved=true for update;
  if not found then raise exception 'creator_not_approved'; end if;
  if creator.identity_status <> 'verified' then raise exception 'identity_verification_required'; end if;
  if creator.payout_hold_until is not null and creator.payout_hold_until>now() then raise exception 'payout_temporarily_held'; end if;
  if private.has_active_restriction('payout') then raise exception 'payout_restricted'; end if;
  select min_withdrawal_amount, coalesce((fx_rates->>p_payout_currency)::numeric,0) into min_value,rate from public.app_content_settings where id='global';
  if p_amount_brl is null or p_amount_brl<coalesce(min_value,50) then raise exception 'minimum_withdrawal'; end if;
  if rate<=0 then raise exception 'missing_exchange_rate'; end if;
  update public.creators set available_balance=available_balance-p_amount_brl,updated_at=now() where id=creator.id and available_balance>=p_amount_brl;
  if not found then raise exception 'insufficient_balance'; end if;
  insert into public.creator_balance(creator_id,available_amount,pending_amount,total_withdrawn) values(creator.id,0,p_amount_brl,0)
    on conflict(creator_id) do update set available_amount=greatest(0,public.creator_balance.available_amount-p_amount_brl),pending_amount=public.creator_balance.pending_amount+p_amount_brl,updated_at=now();
  insert into public.withdrawals(creator_id,amount,fee,net_amount,pix_key,pix_key_type,status,source_currency,payout_currency,payout_amount,exchange_rate,payout_country)
    values(creator.id,p_amount_brl,0,p_amount_brl,trim(p_destination),p_destination_type,'pending','BRL',p_payout_currency,round(p_amount_brl/rate,2),rate,upper(p_country)) returning id into wid;
  return wid;
end $$;
revoke all on function public.request_creator_withdrawal_regional(numeric,text,text,text,text) from public,anon;
grant execute on function public.request_creator_withdrawal_regional(numeric,text,text,text,text) to authenticated;

grant select,insert,delete on public.live_likes to authenticated;
grant select,insert,delete on public.live_comments to authenticated;
grant select,insert on public.live_shares to authenticated;
grant select,insert,update on public.live_offers to authenticated;
grant select,update on public.live_offer_orders to authenticated;
