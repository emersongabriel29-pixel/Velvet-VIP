-- Production readiness: safe creator payout request.
create schema if not exists private;
grant usage on schema private to authenticated,service_role;

create or replace function private.request_creator_withdrawal(
  p_amount numeric,
  p_pix_key text,
  p_pix_key_type text
) returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_uid uuid := auth.uid();
  v_creator public.creators%rowtype;
  v_min numeric := 50;
  v_id uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_pix_key_type not in ('cpf','email','phone','random') then raise exception 'invalid_pix_key_type'; end if;
  if nullif(trim(p_pix_key),'') is null or char_length(trim(p_pix_key)) > 180 then raise exception 'invalid_pix_key'; end if;

  select * into v_creator from public.creators
  where user_id=v_uid and is_approved=true
  for update;
  if not found then raise exception 'creator_not_approved'; end if;
  if coalesce(v_creator.identity_status,'pending') <> 'verified' then raise exception 'identity_verification_required'; end if;
  if v_creator.payout_hold_until is not null and v_creator.payout_hold_until > now() then raise exception 'payout_temporarily_held'; end if;
  if private.has_active_restriction('payout') then raise exception 'payout_restricted'; end if;

  select coalesce(min_withdrawal_amount,50) into v_min
  from public.app_content_settings where id='global';

  if p_amount is null or p_amount < v_min then raise exception 'minimum_withdrawal_%', v_min; end if;
  if p_amount > coalesce(v_creator.available_balance,0) then raise exception 'insufficient_balance'; end if;

  update public.creators
  set available_balance=available_balance-p_amount, updated_at=now()
  where id=v_creator.id and available_balance>=p_amount;
  if not found then raise exception 'insufficient_balance'; end if;

  insert into public.creator_balance(creator_id,available_amount,pending_amount,total_withdrawn)
  values(v_creator.id,0,p_amount,0)
  on conflict(creator_id) do update
    set available_amount=greatest(0,public.creator_balance.available_amount-p_amount),
        pending_amount=public.creator_balance.pending_amount+p_amount,
        updated_at=now();

  insert into public.withdrawals(creator_id,amount,fee,net_amount,pix_key,pix_key_type,status)
  values(v_creator.id,p_amount,0,p_amount,trim(p_pix_key),p_pix_key_type,'pending')
  returning id into v_id;

  return v_id;
end $$;

revoke all on function private.request_creator_withdrawal(numeric,text,text) from public;
grant execute on function private.request_creator_withdrawal(numeric,text,text) to authenticated,service_role;

create or replace function public.request_creator_withdrawal(p_amount numeric,p_pix_key text,p_pix_key_type text)
returns uuid language sql security invoker set search_path=public,private
as $$select private.request_creator_withdrawal(p_amount,p_pix_key,p_pix_key_type)$$;
revoke all on function public.request_creator_withdrawal(numeric,text,text) from public,anon;
grant execute on function public.request_creator_withdrawal(numeric,text,text) to authenticated;
