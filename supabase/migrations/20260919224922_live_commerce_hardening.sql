-- Trigger helpers must not be callable through the Data API.
revoke all on function public.refresh_creator_level_from_video() from public,anon,authenticated;
revoke all on function public.refresh_creator_level_from_comment() from public,anon,authenticated;
revoke all on function public.refresh_creator_level_from_tip() from public,anon,authenticated;
revoke all on function public.refresh_creator_level_from_purchase() from public,anon,authenticated;
revoke all on function public.refresh_creator_level_from_live() from public,anon,authenticated;

-- Keep the privileged payout implementation outside the exposed schema. The
-- public entry point is a security-invoker wrapper and the private function
-- still verifies auth.uid(), KYC, restrictions, balance and the FX snapshot.
alter function public.request_creator_withdrawal_regional(numeric,text,text,text,text) set schema private;
revoke all on function private.request_creator_withdrawal_regional(numeric,text,text,text,text) from public,anon;
grant execute on function private.request_creator_withdrawal_regional(numeric,text,text,text,text) to authenticated,service_role;
create function public.request_creator_withdrawal_regional(
  p_amount_brl numeric,p_destination text,p_destination_type text,p_payout_currency text,p_country text
) returns uuid language sql security invoker set search_path=''
as $$select private.request_creator_withdrawal_regional(p_amount_brl,p_destination,p_destination_type,p_payout_currency,p_country)$$;
revoke all on function public.request_creator_withdrawal_regional(numeric,text,text,text,text) from public,anon;
grant execute on function public.request_creator_withdrawal_regional(numeric,text,text,text,text) to authenticated;

create index if not exists live_comments_user_idx on public.live_comments(user_id);
create index if not exists live_likes_user_idx on public.live_likes(user_id);
create index if not exists live_shares_live_idx on public.live_shares(live_id);
create index if not exists live_shares_user_idx on public.live_shares(user_id);
create index if not exists live_offers_creator_idx on public.live_offers(creator_id);
create index if not exists live_offer_orders_offer_idx on public.live_offer_orders(offer_id);
create index if not exists live_offer_orders_live_idx on public.live_offer_orders(live_id);
create index if not exists live_offer_orders_buyer_idx on public.live_offer_orders(buyer_id);
create index if not exists live_solo_requests_live_idx on public.live_solo_requests(live_id);
