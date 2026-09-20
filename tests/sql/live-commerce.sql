-- Live offer payment, idempotency and refund are atomic. Fixtures roll back.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare buyer uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid(); creator uuid; live uuid; offer uuid; checkout uuid;
  payment_id text:='8'||abs(hashtext(gen_random_uuid()::text)::bigint)::text; event jsonb; result jsonb; balance numeric;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (buyer,'live-buyer-'||buyer||'@example.invalid',jsonb_build_object('birth_date','1990-01-01','username','lb_'||replace(buyer::text,'-',''),'name','Live buyer')),
    (seller,'live-seller-'||seller||'@example.invalid',jsonb_build_object('birth_date','1990-01-01','username','ls_'||replace(seller::text,'-',''),'name','Live seller','requested_role','creator'));
  select id into creator from public.creators where user_id=seller;
  update public.creators set is_approved=true,identity_status='verified',tip_share_percent=90 where id=creator;
  insert into public.live_sessions(creator_id,title,status,moderation_status,required_plan,tips_enabled)
    values(creator,'Live QA','live','approved','free',true) returning id into live;
  insert into public.live_offers(live_id,creator_id,title,description,amount,currency,status,max_orders)
    values(live,creator,'Pedido QA','Teste fechado',20,'BRL','active',1) returning id into offer;
  insert into public.checkout_sessions(user_id,kind,reference_id,amount,currency,metadata)
    values(buyer,'live_offer',offer,20,'BRL',jsonb_build_object('creator_id',creator,'live_id',live,'offer_id',offer)) returning id into checkout;
  event:=jsonb_build_object('id',payment_id,'status','approved','external_reference',checkout,'transaction_amount',20,'currency_id','BRL');
  perform public.settle_verified_payment(event);
  if not exists(select 1 from public.live_offer_orders where checkout_session_id=checkout and status='paid') then raise exception 'live_order_not_created'; end if;
  if (select status from public.live_offers where id=offer)<>'sold_out' then raise exception 'offer_not_sold_out'; end if;
  select available_balance into balance from public.creators where id=creator;
  if balance<>18 then raise exception 'incorrect_live_credit_%',balance; end if;
  result:=public.settle_verified_payment(event);
  if result->>'duplicate'<>'true' then raise exception 'live_duplicate_not_detected'; end if;
  perform public.settle_verified_payment(event||'{"status":"refunded"}'::jsonb);
  if (select status from public.live_offer_orders where checkout_session_id=checkout)<>'refunded' then raise exception 'live_refund_missing'; end if;
  select available_balance into balance from public.creators where id=creator;
  if balance<>0 then raise exception 'live_refund_balance_%',balance; end if;
end $$;
select 'PASS: live offer settlement, sold-out, duplicate and refund' as result;
rollback;
