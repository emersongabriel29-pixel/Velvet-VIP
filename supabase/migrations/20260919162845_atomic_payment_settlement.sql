-- A provider event, entitlement and creator credit commit together or all roll back.
-- Call only after verifying the provider signature and fetching the authoritative payment.
alter table public.subscriptions add column if not exists checkout_session_id uuid references public.checkout_sessions(id);
alter table public.creator_subscriptions add column if not exists checkout_session_id uuid references public.checkout_sessions(id);
alter table public.purchases add column if not exists checkout_session_id uuid references public.checkout_sessions(id);
create index if not exists subscriptions_checkout_session_idx on public.subscriptions(checkout_session_id);
create index if not exists creator_subscriptions_checkout_session_idx on public.creator_subscriptions(checkout_session_id);
create index if not exists purchases_checkout_session_idx on public.purchases(checkout_session_id);

create or replace function public.settle_verified_payment(p_payment jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare
  s public.checkout_sessions%rowtype;
  plan public.creator_plans%rowtype;
  payment_id text := p_payment->>'id';
  provider_status text := p_payment->>'status';
  event_key text;
  previous_event text;
  creator_id uuid;
  share numeric;
  net numeric;
  expiry timestamptz;
  transaction_kind text;
  approved_id text;
  tier text;
  period text;
  free_plan uuid;
  source_session uuid;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only'; end if;
  if payment_id is null or payment_id !~ '^[0-9]+$' then raise exception 'invalid_payment_id'; end if;
  if provider_status is null then raise exception 'invalid_payment_status'; end if;
  select * into s from public.checkout_sessions where id=(p_payment->>'external_reference')::uuid for update;
  if not found then raise exception 'checkout_not_found'; end if;
  if s.gateway <> 'mercadopago' or p_payment->>'currency_id' is distinct from 'BRL'
     or (p_payment->>'transaction_amount')::numeric is distinct from s.amount then
    raise exception 'payment_integrity_failed';
  end if;
  event_key := payment_id || ':' || provider_status;
  select status into previous_event from public.payment_events
    where gateway='mercadopago' and gateway_event_id=event_key;
  if previous_event in ('processed','ignored') then return jsonb_build_object('ok',true,'duplicate',true); end if;
  -- A checkout cannot credit a second provider payment. Surface it for reconciliation.
  approved_id := s.metadata->>'settled_payment_id';
  if approved_id is not null and approved_id <> payment_id then raise exception 'checkout_already_settled'; end if;
  insert into public.payment_events(gateway,gateway_event_id,payment_id,event_type,status,payload)
    values('mercadopago',event_key,payment_id,'payment','received',jsonb_build_object('status',provider_status,'checkout_session_id',s.id))
    on conflict(gateway,gateway_event_id) do update set status='received';

  if s.status='refunded' and provider_status not in ('refunded','charged_back') then
    update public.payment_events set status='ignored',processed_at=now() where gateway='mercadopago' and gateway_event_id=event_key;
    return jsonb_build_object('ok',true,'ignored',true);
  end if;

  if provider_status in ('refunded','charged_back') then
    -- Reverse only the entitlement issued by this checkout, never a later repurchase.
    select ft.creator_id into creator_id from public.financial_transactions ft
      where ft.provider='mercadopago' and ft.provider_reference=payment_id;
    if creator_id is not null then perform public.reverse_creator_credit(creator_id,'mercadopago',payment_id); end if;
    if s.kind='creator_plan' then
      update public.creator_subscriptions set status='cancelled' where checkout_session_id=s.id;
      update public.subscriptions set status='cancelled' where checkout_session_id=s.id;
    elsif s.kind='pay_per_view' then
      update public.purchases set status='refunded' where checkout_session_id=s.id;
    elsif s.kind='tip' then
      update public.creator_tips set status='refunded' where payment_gateway_id=payment_id;
    elsif s.kind='platform_plan' then
      select id into source_session from public.checkout_sessions
        where user_id=s.user_id and kind='platform_plan' and status='paid' order by created_at desc limit 1;
      if source_session=s.id then
        select id into free_plan from public.platform_plans where slug='gratis';
        update public.profiles set platform_plan_id=free_plan where id=s.user_id and platform_plan_id=s.reference_id;
      end if;
    end if;
    update public.financial_transactions set state=case when provider_status='charged_back' then 'chargeback' else 'refunded' end,updated_at=now()
      where provider='mercadopago' and provider_reference=payment_id;
    update public.checkout_sessions set status='refunded',metadata=metadata||jsonb_build_object('settled_payment_id',payment_id),updated_at=now() where id=s.id;
  elsif provider_status='approved' then
    if s.kind='platform_plan' then
      update public.profiles set platform_plan_id=s.reference_id where id=s.user_id;
      if not found then raise exception 'profile_not_found'; end if;
    else
      if s.kind='creator_plan' then
        select * into plan from public.creator_plans where id=s.reference_id;
        if not found then raise exception 'creator_plan_not_found'; end if;
        creator_id := plan.creator_id;
        share := coalesce((s.metadata->>'share_percent')::numeric,plan.creator_share_percent);
        tier := coalesce(s.metadata->>'tier',plan.tier);
        period := coalesce(s.metadata->>'billing_period',plan.billing_period);
        expiry := now() + case period when 'annual' then interval '365 days' when 'semiannual' then interval '180 days' else interval '30 days' end;
        transaction_kind := 'subscription';
      elsif s.kind='pay_per_view' then
        creator_id := (s.metadata->>'creator_id')::uuid;
        select coalesce((s.metadata->>'share_percent')::numeric,100-platform_fee_percent) into share from public.platform_settings where id=true;
        share := coalesce(share,85);
        transaction_kind := 'ppv';
        if exists(select 1 from public.purchases where user_id=s.user_id and video_id=s.reference_id and status='completed' and checkout_session_id is distinct from s.id) then
          raise exception 'content_already_purchased_reconciliation_required';
        end if;
      elsif s.kind='tip' then
        creator_id := (s.metadata->>'creator_id')::uuid;
        select coalesce((s.metadata->>'share_percent')::numeric,tip_share_percent) into share from public.creators where id=creator_id;
        transaction_kind := 'tip';
      else raise exception 'unsupported_checkout_kind';
      end if;
      if creator_id is null or share is null or share<0 or share>100 then raise exception 'invalid_creator_share'; end if;
      net := round(s.amount*share/100,2);
      if s.kind='creator_plan' then
        insert into public.creator_subscriptions(user_id,creator_id,creator_plan_id,status,amount_paid,creator_amount,platform_amount,billing_period,current_period_end,checkout_session_id)
          values(s.user_id,creator_id,s.reference_id,'active',s.amount,net,s.amount-net,period,expiry,s.id)
          on conflict(user_id,creator_id) do update set creator_plan_id=excluded.creator_plan_id,status='active',amount_paid=excluded.amount_paid,
            creator_amount=excluded.creator_amount,platform_amount=excluded.platform_amount,billing_period=excluded.billing_period,current_period_end=excluded.current_period_end,checkout_session_id=excluded.checkout_session_id;
        insert into public.subscriptions(user_id,creator_id,plan_tier,amount,status,current_period_end,checkout_session_id)
          values(s.user_id,creator_id,tier,s.amount,'active',expiry,s.id)
          on conflict(user_id,creator_id) do update set plan_tier=excluded.plan_tier,amount=excluded.amount,status='active',current_period_end=excluded.current_period_end,checkout_session_id=excluded.checkout_session_id;
      elsif s.kind='pay_per_view' then
        insert into public.purchases(user_id,video_id,creator_id,amount,payment_method,status,checkout_session_id)
          values(s.user_id,s.reference_id,creator_id,s.amount,case when p_payment->>'payment_type_id'='credit_card' then 'credit_card' else 'pix' end,'completed',s.id)
          on conflict(user_id,video_id) do update set amount=excluded.amount,payment_method=excluded.payment_method,status='completed',checkout_session_id=excluded.checkout_session_id;
      else
        insert into public.creator_tips(sender_id,creator_id,amount,platform_fee,creator_amount,message,status,payment_gateway_id)
          values(s.user_id,creator_id,s.amount,s.amount-net,net,coalesce(s.metadata->>'message',''),'paid',payment_id)
          on conflict(payment_gateway_id) do nothing;
      end if;
      perform public.credit_creator(creator_id,s.amount,payment_id,jsonb_build_object('provider','mercadopago','kind',transaction_kind,'checkout_session_id',s.id,'share_percent',share));
      insert into public.financial_transactions(user_id,creator_id,checkout_session_id,kind,gross_amount,creator_amount,platform_amount,state,provider,provider_reference)
        values(s.user_id,creator_id,s.id,transaction_kind,s.amount,net,s.amount-net,'available','mercadopago',payment_id)
        on conflict(provider,provider_reference) do nothing;
    end if;
    update public.checkout_sessions set status='paid',metadata=metadata||jsonb_build_object('settled_payment_id',payment_id),updated_at=now() where id=s.id;
  elsif s.status <> 'paid' then
    update public.checkout_sessions set status=case provider_status when 'rejected' then 'failed' when 'cancelled' then 'cancelled' else 'pending' end,updated_at=now() where id=s.id;
  end if;
  update public.payment_events set status='processed',processed_at=now() where gateway='mercadopago' and gateway_event_id=event_key;
  return jsonb_build_object('ok',true,'status',provider_status);
end $$;
revoke all on function public.settle_verified_payment(jsonb) from public,anon,authenticated;
grant execute on function public.settle_verified_payment(jsonb) to service_role;
