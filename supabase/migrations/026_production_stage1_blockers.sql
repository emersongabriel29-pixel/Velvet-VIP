-- Production stage 1: close critical pre-production gaps.
-- 1) Self-declared DOB is eligibility input only; it never verifies identity/age.
alter table public.profiles add column if not exists age_verification_source text;
alter table public.profiles add column if not exists age_verification_reference text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role','user');
  safe_role text := case when requested_role='creator' then 'creator' else 'user' end;
  birth date := nullif(new.raw_user_meta_data->>'birth_date','')::date;
begin
  if birth is null or extract(year from age(current_date,birth)) < 18 then
    raise exception 'User must be at least 18 years old';
  end if;
  insert into public.profiles(id,username,name,birth_date,role,age_verified,age_verified_at,age_verification_source,age_verification_reference)
  values(new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''),split_part(new.email,'@',1)),
    coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)),
    birth,safe_role,false,null,null,null);
  if safe_role='creator' then
    insert into public.creators(user_id,display_name,handle,avatar_url,is_approved)
    values(new.id,
      coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)),
      coalesce(nullif(new.raw_user_meta_data->>'username',''),split_part(new.email,'@',1)),
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop',false);
  end if;
  return new;
end $$;

-- Existing pre-production flags have no trustworthy verification provenance.
update public.profiles
set age_verified=false, age_verified_at=null
where age_verified=true and age_verification_source is null;

create or replace function public.record_age_verification(
  p_user_id uuid,p_source text,p_reference text
) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
  if nullif(trim(p_source),'') is null or nullif(trim(p_reference),'') is null then
    raise exception 'verification_provenance_required';
  end if;
  update public.profiles set age_verified=true,age_verified_at=now(),
    age_verification_source=left(trim(p_source),80),
    age_verification_reference=left(trim(p_reference),240),updated_at=now()
  where id=p_user_id;
  if not found then raise exception 'user_not_found'; end if;
end $$;
revoke all on function public.record_age_verification(uuid,text,text) from public,anon,authenticated;

-- 2) Make wallet credits provider-aware and idempotent.
create or replace function public.record_wallet_entry(p_user_id uuid,p_entry_type text,p_amount numeric,p_reference_id text default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare entry_id uuid; p_provider text := nullif(p_metadata->>'provider','');
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Server-only operation'; end if;
  if p_amount=0 then raise exception 'Amount cannot be zero'; end if;
  insert into public.wallet_ledger(user_id,entry_type,amount,reference_id,metadata,provider)
  values(p_user_id,p_entry_type,p_amount,p_reference_id,p_metadata,p_provider)
  on conflict (provider,reference_id,entry_type) where provider is not null and reference_id is not null do nothing
  returning id into entry_id;
  if entry_id is null and p_provider is not null and p_reference_id is not null then
    select id into entry_id from public.wallet_ledger
    where provider=p_provider and reference_id=p_reference_id and entry_type=p_entry_type limit 1;
    return entry_id;
  end if;
  update public.profiles set wallet_balance=wallet_balance+p_amount,updated_at=now() where id=p_user_id;
  if not found then raise exception 'User not found'; end if;
  return entry_id;
end $$;
revoke all on function public.record_wallet_entry(uuid,text,numeric,text,jsonb) from public,anon,authenticated;

create or replace function public.credit_creator(p_creator_id uuid,p_gross numeric,p_reference_id text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare creator_user uuid; creator_entry uuid; share numeric:=0.85; net numeric; p_provider text:=nullif(p_metadata->>'provider','');
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Server-only operation'; end if;
  if p_gross<=0 then raise exception 'Gross must be positive'; end if;
  select user_id into creator_user from public.creators where id=p_creator_id and is_approved=true;
  if creator_user is null then raise exception 'Creator not found or not approved'; end if;
  net:=round(p_gross*share,2);
  insert into public.wallet_ledger(user_id,entry_type,amount,reference_id,metadata,provider)
  values(creator_user,'creator_credit',net,p_reference_id,p_metadata,p_provider)
  on conflict (provider,reference_id,entry_type) where provider is not null and reference_id is not null do nothing
  returning id into creator_entry;
  if creator_entry is null and p_provider is not null and p_reference_id is not null then
    select id into creator_entry from public.wallet_ledger
    where provider=p_provider and reference_id=p_reference_id and entry_type='creator_credit' limit 1;
    return creator_entry;
  end if;
  update public.profiles set wallet_balance=wallet_balance+net,updated_at=now() where id=creator_user;
  update public.creators set gross_earnings=gross_earnings+p_gross,available_balance=available_balance+net,updated_at=now() where id=p_creator_id;
  insert into public.creator_balance(creator_id,available_amount,pending_amount,total_withdrawn)
  values(p_creator_id,net,0,0)
  on conflict(creator_id) do update set available_amount=public.creator_balance.available_amount+net,updated_at=now();
  return creator_entry;
end $$;
revoke all on function public.credit_creator(uuid,numeric,text,jsonb) from public,anon,authenticated;
