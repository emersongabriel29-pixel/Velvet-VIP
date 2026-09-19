-- Canonical creator-plan metadata and idempotent creator credit/reversal primitives.
alter table public.creator_plans add column if not exists benefits jsonb not null default '[]'::jsonb;

create or replace function public.credit_creator(
  p_creator_id uuid,
  p_gross numeric,
  p_reference_id text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare
  creator_user uuid;
  creator_entry uuid;
  share numeric:=coalesce(nullif(p_metadata->>'share_percent','')::numeric/100,0.85);
  net numeric;
  p_provider text:=nullif(p_metadata->>'provider','');
  meta jsonb;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Server-only operation'; end if;
  if p_gross<=0 then raise exception 'Gross must be positive'; end if;
  if share<0 or share>1 then raise exception 'Invalid creator share'; end if;
  select user_id into creator_user from public.creators where id=p_creator_id and is_approved=true;
  if creator_user is null then raise exception 'Creator not found or not approved'; end if;
  net:=round(p_gross*share,2);
  meta:=coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('creator_id',p_creator_id,'gross',p_gross,'share_percent',share*100);
  insert into public.wallet_ledger(user_id,entry_type,amount,reference_id,metadata,provider)
  values(creator_user,'creator_credit',net,p_reference_id,meta,p_provider)
  on conflict (provider,reference_id,entry_type) where provider is not null and reference_id is not null do nothing
  returning id into creator_entry;
  if creator_entry is null and p_provider is not null and p_reference_id is not null then
    select id into creator_entry from public.wallet_ledger
    where provider=p_provider and reference_id=p_reference_id and entry_type='creator_credit' limit 1;
    return creator_entry;
  end if;
  update public.profiles set wallet_balance=coalesce(wallet_balance,0)+net,updated_at=now() where id=creator_user;
  update public.creators set gross_earnings=coalesce(gross_earnings,0)+p_gross,available_balance=coalesce(available_balance,0)+net,updated_at=now() where id=p_creator_id;
  insert into public.creator_balance(creator_id,available_amount,pending_amount,total_withdrawn)
  values(p_creator_id,net,0,0)
  on conflict(creator_id) do update set available_amount=public.creator_balance.available_amount+net,updated_at=now();
  return creator_entry;
end $$;
revoke all on function public.credit_creator(uuid,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.credit_creator(uuid,numeric,text,jsonb) to service_role;

create or replace function public.reverse_creator_credit(
  p_creator_id uuid,
  p_provider text,
  p_reference_id text
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare
  creator_user uuid; original record; reversal_id uuid; reversal_ref text; gross numeric;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Server-only operation'; end if;
  select user_id into creator_user from public.creators where id=p_creator_id for update;
  if creator_user is null then raise exception 'Creator not found'; end if;
  select id,amount,metadata into original from public.wallet_ledger
   where user_id=creator_user and provider=p_provider and reference_id=p_reference_id and entry_type='creator_credit'
   limit 1;
  if original.id is null then return null; end if;
  reversal_ref:='refund:'||p_reference_id;
  insert into public.wallet_ledger(user_id,entry_type,amount,reference_id,metadata,provider)
  values(creator_user,'adjustment',-abs(original.amount),reversal_ref,
    jsonb_build_object('reason','provider_refund','original_entry_id',original.id,'creator_id',p_creator_id),p_provider)
  on conflict (provider,reference_id,entry_type) where provider is not null and reference_id is not null do nothing
  returning id into reversal_id;
  if reversal_id is null then
    select id into reversal_id from public.wallet_ledger
     where provider=p_provider and reference_id=reversal_ref and entry_type='adjustment' limit 1;
    return reversal_id;
  end if;
  gross:=coalesce(nullif(original.metadata->>'gross','')::numeric,0);
  update public.profiles set wallet_balance=coalesce(wallet_balance,0)-abs(original.amount),updated_at=now() where id=creator_user;
  update public.creators set
    gross_earnings=greatest(0,coalesce(gross_earnings,0)-gross),
    available_balance=coalesce(available_balance,0)-abs(original.amount),
    payout_hold_until=case when coalesce(available_balance,0)-abs(original.amount)<0 then greatest(coalesce(payout_hold_until,now()),now()+interval '30 days') else payout_hold_until end,
    updated_at=now()
  where id=p_creator_id;
  update public.creator_balance set available_amount=coalesce(available_amount,0)-abs(original.amount),updated_at=now() where creator_id=p_creator_id;
  return reversal_id;
end $$;
revoke all on function public.reverse_creator_credit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reverse_creator_credit(uuid,text,text) to service_role;
