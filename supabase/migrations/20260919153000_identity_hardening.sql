-- Identity/KYC state may only be recorded by a trusted server adapter.
create or replace function public.record_creator_identity_verification(
  p_user_id uuid,
  p_provider text,
  p_reference text,
  p_identity_verified boolean,
  p_age_verified boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is not null then
    raise exception 'server_only' using errcode='42501';
  end if;
  if nullif(trim(p_provider),'') is null or nullif(trim(p_reference),'') is null then
    raise exception 'provider_reference_required' using errcode='22023';
  end if;

  update public.creators
     set identity_status=case when p_identity_verified then 'verified' else 'rejected' end,
         identity_provider=left(trim(p_provider),80),
         identity_reference=left(trim(p_reference),240),
         identity_verified_at=case when p_identity_verified then now() else null end,
         is_approved=case when p_identity_verified then is_approved else false end,
         updated_at=now()
   where user_id=p_user_id;
  if not found then raise exception 'creator_not_found' using errcode='P0002'; end if;

  if p_identity_verified and p_age_verified then
    update public.profiles
       set age_verified=true,
           age_verified_at=now(),
           age_verification_source=left(trim(p_provider),80),
           age_verification_reference=left(trim(p_reference),240)
     where id=p_user_id;
  end if;
end;
$$;
revoke all on function public.record_creator_identity_verification(uuid,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.record_creator_identity_verification(uuid,text,text,boolean,boolean) to service_role;
