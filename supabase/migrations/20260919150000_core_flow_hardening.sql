-- Core flow hardening: authenticated, rate-limited moderation reports and safe creator price updates.

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_report_id uuid;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if p_target_type not in ('video','creator','comment') then
    raise exception 'invalid_target_type' using errcode='22023';
  end if;

  if p_reason not in (
    'unauthorized_content','privacy_violation','fake_identity','spam','inappropriate_content',
    'underage_suspicion','hate_speech','racism','threat','harassment','sexual_harassment',
    'non_consensual','privacy','copyright','other'
  ) then
    raise exception 'invalid_report_reason' using errcode='22023';
  end if;

  if not public.consume_rate_limit('content_report', v_uid::text, 8, 3600) then
    raise exception 'rate_limited' using errcode='P0001';
  end if;

  if p_target_type='video' then
    perform 1 from public.videos where id=p_target_id and is_removed=false;
  elsif p_target_type='creator' then
    perform 1 from public.creators where id=p_target_id;
  else
    perform 1 from public.comments where id=p_target_id;
  end if;
  if not found then raise exception 'target_not_found' using errcode='P0002'; end if;

  insert into public.reports(reporter_id,target_type,target_id,reason,description,status)
  values(v_uid,p_target_type,p_target_id,p_reason,left(coalesce(p_description,''),2000),'pending')
  returning id into v_report_id;

  return v_report_id;
end;
$$;
revoke all on function public.submit_content_report(text,uuid,text,text) from public,anon;
grant execute on function public.submit_content_report(text,uuid,text,text) to authenticated;

create or replace function public.update_creator_prices(p_basic numeric,p_vip numeric)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_basic<5 or p_vip<5 or p_basic>10000 or p_vip>10000 or p_vip<p_basic then
    raise exception 'invalid_creator_prices' using errcode='22023';
  end if;
  update public.creators
     set subscription_price_basic=round(p_basic,2),
         subscription_price_vip=round(p_vip,2),
         updated_at=now()
   where user_id=v_uid and is_approved=true;
  if not found then raise exception 'approved_creator_required' using errcode='42501'; end if;
end;
$$;
revoke all on function public.update_creator_prices(numeric,numeric) from public,anon;
grant execute on function public.update_creator_prices(numeric,numeric) to authenticated;
