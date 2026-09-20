-- Synthetic fixtures never commit. This checks database settlement, not Mercado Pago.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
#variable_conflict use_variable
declare
  buyer uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid(); creator uuid; video uuid; plan uuid;
  checkout uuid; second_checkout uuid; ev jsonb; result jsonb; balance numeric;
  payment_id text:='9'||abs(hashtext(gen_random_uuid()::text)::bigint)::text;
  failed boolean:=false;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (buyer,'qa-'||buyer||'@example.invalid',jsonb_build_object('birth_date','1990-01-01','username','qa_'||replace(buyer::text,'-',''),'name','QA buyer')),
    (seller,'qa-'||seller||'@example.invalid',jsonb_build_object('birth_date','1990-01-01','username','qa_'||replace(seller::text,'-',''),'name','QA seller','requested_role','creator'));
  select id into creator from public.creators where user_id=seller;
  update public.creators set is_approved=true,identity_status='verified' where id=creator;
  insert into public.videos(creator_id,title,video_url,thumbnail_url,is_premium,premium_price,required_tier)
    values(creator,'QA fixture','storage://'||seller||'/videos/qa.mp4','',true,20,'vip') returning id into video;
  insert into public.checkout_sessions(user_id,kind,reference_id,amount,metadata)
    values(buyer,'pay_per_view',video,20,jsonb_build_object('creator_id',creator,'share_percent',85)) returning id into checkout;
  ev:=jsonb_build_object('id',payment_id,'status','approved','external_reference',checkout,'transaction_amount',20,'currency_id','BRL');
  -- Wrong price must create neither a receipt nor an entitlement.
  begin perform public.settle_verified_payment(ev||'{"transaction_amount":1}'::jsonb); exception when others then failed:=true; end;
  if not failed then raise exception 'tampered amount accepted'; end if;
  if exists(select 1 from public.payment_events where gateway_event_id=payment_id||':approved') then raise exception 'failed event persisted'; end if;
  perform public.settle_verified_payment(ev);
  if not exists(select 1 from public.purchases where checkout_session_id=checkout and status='completed') then raise exception 'purchase not released'; end if;
  select available_balance into balance from public.creators where id=creator;
  if balance<>17 then raise exception 'incorrect creator balance: %',balance; end if;
  result:=public.settle_verified_payment(ev);
  if result->>'duplicate'<>'true' then raise exception 'duplicate not detected'; end if;
  select available_balance into balance from public.creators where id=creator;
  if balance<>17 then raise exception 'duplicate credited twice'; end if;
  perform public.settle_verified_payment(ev||'{"status":"pending"}'::jsonb);
  if (select status from public.checkout_sessions where id=checkout)<>'paid' then raise exception 'stale event downgraded paid'; end if;
  perform public.settle_verified_payment(ev||'{"status":"refunded"}'::jsonb);
  if (select status from public.purchases where checkout_session_id=checkout)<>'refunded' then raise exception 'refund access still active'; end if;
  select available_balance into balance from public.creators where id=creator;
  if balance<>0 then raise exception 'refund balance incorrect'; end if;
  perform public.settle_verified_payment(ev||'{"status":"refunded"}'::jsonb);
  select available_balance into balance from public.creators where id=creator;
  if balance<>0 then raise exception 'refund applied twice'; end if;
  perform public.settle_verified_payment(ev);
  if (select status from public.checkout_sessions where id=checkout)<>'refunded' then raise exception 'refunded checkout revived'; end if;
  -- Repurchase remains active when an old chargeback arrives.
  insert into public.checkout_sessions(user_id,kind,reference_id,amount,metadata)
    values(buyer,'pay_per_view',video,20,jsonb_build_object('creator_id',creator,'share_percent',85)) returning id into second_checkout;
  perform public.settle_verified_payment(ev||jsonb_build_object('id',payment_id||'1','external_reference',second_checkout));
  perform public.settle_verified_payment(ev||'{"status":"charged_back"}'::jsonb);
  if not exists(select 1 from public.purchases where checkout_session_id=second_checkout and status='completed') then raise exception 'old refund revoked repurchase'; end if;
  -- A failed credit rolls back preceding entitlement writes and can be retried.
  insert into public.creator_plans(creator_id,name,tier,price) values(creator,'QA','basic',30) returning id into plan;
  insert into public.checkout_sessions(user_id,kind,reference_id,amount,metadata)
    values(buyer,'creator_plan',plan,30,jsonb_build_object('creator_id',creator,'share_percent',85,'tier','basic','billing_period','monthly')) returning id into checkout;
  ev:=jsonb_build_object('id',payment_id||'2','status','approved','external_reference',checkout,'transaction_amount',30,'currency_id','BRL');
  update public.creators set is_approved=false where id=creator;
  failed:=false;
  begin perform public.settle_verified_payment(ev); exception when others then failed:=true; end;
  if not failed then raise exception 'unapproved creator credited'; end if;
  if exists(select 1 from public.subscriptions where checkout_session_id=checkout) then raise exception 'partial entitlement committed'; end if;
  if exists(select 1 from public.payment_events where gateway_event_id=payment_id||'2:approved') then raise exception 'failed event prevents retry'; end if;
  update public.creators set is_approved=true where id=creator;
  perform public.settle_verified_payment(ev);
  if not exists(select 1 from public.subscriptions where checkout_session_id=checkout and status='active') then raise exception 'retry did not release subscription'; end if;
  perform public.settle_verified_payment(ev||'{"status":"charged_back"}'::jsonb);
  if exists(select 1 from public.subscriptions where checkout_session_id=checkout and status='active') then raise exception 'chargeback not revoked'; end if;
end $$;
select 'PASS: amount, approval, duplicate, stale event, refund, repurchase, rollback, retry, subscription, chargeback' as result;
rollback;
