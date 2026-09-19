-- Canonical report -> case -> punishment audit flow.
alter table public.reports
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id);

alter table public.moderation_cases
  add column if not exists content_report_id uuid references public.reports(id);

create unique index if not exists moderation_cases_content_report_unique
  on public.moderation_cases(content_report_id)
  where content_report_id is not null;

create or replace function public.open_content_report_case(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid:=auth.uid();
  v_report public.reports%rowtype;
  v_subject_user uuid;
  v_subject_creator uuid;
  v_case uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;

  select * into v_report from public.reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode='P0002'; end if;

  if v_report.status in ('resolved','dismissed') then
    raise exception 'report_already_closed' using errcode='22023';
  end if;

  if v_report.target_type='video' then
    select c.user_id,c.id into v_subject_user,v_subject_creator
      from public.videos v join public.creators c on c.id=v.creator_id
     where v.id=v_report.target_id;
  elsif v_report.target_type='creator' then
    select c.user_id,c.id into v_subject_user,v_subject_creator
      from public.creators c where c.id=v_report.target_id;
  elsif v_report.target_type='comment' then
    select cm.user_id,c.id into v_subject_user,v_subject_creator
      from public.comments cm
      left join public.creators c on c.user_id=cm.user_id
     where cm.id=v_report.target_id;
  end if;

  if v_subject_user is null then
    raise exception 'report_subject_not_found' using errcode='P0002';
  end if;

  insert into public.moderation_cases(
    subject_user_id,subject_creator_id,content_report_id,reason_code,summary,status,opened_by
  ) values(
    v_subject_user,v_subject_creator,v_report.id,v_report.reason,
    left(coalesce(v_report.description,'Denúncia recebida'),2000),'reviewing',v_admin
  )
  on conflict (content_report_id) where content_report_id is not null
  do update set status='reviewing'
  returning id into v_case;

  update public.reports
     set status='reviewing',admin_notes=coalesce(admin_notes,'')
   where id=v_report.id;

  insert into public.moderation_audit_log(case_id,actor_id,event,payload)
  values(v_case,v_admin,'content_report_case_opened',
    jsonb_build_object('report_id',v_report.id,'target_type',v_report.target_type,'target_id',v_report.target_id,'reason',v_report.reason));

  return v_case;
end;
$$;

create or replace function public.resolve_content_report(
  p_report_id uuid,
  p_status text,
  p_admin_notes text default ''
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid:=auth.uid();
  v_case uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_status not in ('resolved','dismissed') then
    raise exception 'invalid_report_resolution' using errcode='22023';
  end if;

  select id into v_case from public.moderation_cases where content_report_id=p_report_id limit 1;

  update public.reports
     set status=p_status,
         admin_notes=left(coalesce(p_admin_notes,''),4000),
         resolved_at=now(),
         resolved_by=v_admin
   where id=p_report_id;
  if not found then raise exception 'report_not_found' using errcode='P0002'; end if;

  if v_case is not null then
    update public.moderation_cases
       set status='closed',closed_at=coalesce(closed_at,now())
     where id=v_case and status not in ('closed');
  end if;

  insert into public.moderation_audit_log(case_id,actor_id,event,payload)
  values(v_case,v_admin,'content_report_resolved',
    jsonb_build_object('report_id',p_report_id,'status',p_status,'admin_notes',left(coalesce(p_admin_notes,''),4000)));
end;
$$;

create or replace function public.apply_moderation_action(
  p_subject_user_id uuid,
  p_action_type text,
  p_reason_code text,
  p_scopes text[],
  p_ends_at timestamptz default null,
  p_internal_note text default '',
  p_user_message text default '',
  p_case_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid:=auth.uid();
  v_case uuid:=p_case_id;
  v_subject_user uuid:=p_subject_user_id;
  v_creator uuid;
  v_action uuid;
  v_scope text;
  v_report uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_action_type not in ('warning','restriction','suspension','demonetization','content_removal','deactivation','permanent_ban') then
    raise exception 'invalid_action_type' using errcode='22023';
  end if;
  if nullif(trim(p_reason_code),'') is null then
    raise exception 'reason_required' using errcode='22023';
  end if;

  if v_case is not null then
    select subject_user_id,subject_creator_id,content_report_id
      into v_subject_user,v_creator,v_report
      from public.moderation_cases
     where id=v_case for update;
    if not found then raise exception 'case_not_found' using errcode='P0002'; end if;
    if p_subject_user_id is not null and p_subject_user_id<>v_subject_user then
      raise exception 'case_subject_mismatch' using errcode='22023';
    end if;
  else
    if v_subject_user is null then raise exception 'subject_required' using errcode='22023'; end if;
    select id into v_creator from public.creators where user_id=v_subject_user limit 1;
    insert into public.moderation_cases(subject_user_id,subject_creator_id,reason_code,summary,status,opened_by)
    values(v_subject_user,v_creator,left(trim(p_reason_code),120),left(coalesce(p_internal_note,''),2000),'reviewing',v_admin)
    returning id into v_case;
  end if;

  insert into public.moderation_actions(
    case_id,subject_user_id,subject_creator_id,action_type,reason_code,internal_note,user_message,
    starts_at,ends_at,status,created_by
  ) values(
    v_case,v_subject_user,v_creator,p_action_type,left(trim(p_reason_code),120),
    left(coalesce(p_internal_note,''),4000),left(coalesce(p_user_message,''),2000),
    now(),p_ends_at,'active',v_admin
  ) returning id into v_action;

  if p_action_type<>'warning' then
    foreach v_scope in array coalesce(p_scopes,'{}'::text[]) loop
      if v_scope not in ('account','publish','live','comment','message','purchase','monetization','withdrawal') then
        raise exception 'invalid_restriction_scope' using errcode='22023';
      end if;
      insert into public.account_restrictions(action_id,subject_user_id,scope,starts_at,ends_at,is_active)
      values(v_action,v_subject_user,v_scope,now(),p_ends_at,true)
      on conflict(action_id,scope) do nothing;
    end loop;
  end if;

  update public.moderation_cases set status='decided' where id=v_case;

  if v_report is not null then
    update public.reports
       set status='resolved',resolved_at=now(),resolved_by=v_admin,
           admin_notes=left(coalesce(p_internal_note,''),4000)
     where id=v_report;
  end if;

  insert into public.moderation_audit_log(case_id,action_id,actor_id,event,payload)
  values(v_case,v_action,v_admin,'punishment_applied',
    jsonb_build_object('action_type',p_action_type,'scopes',coalesce(p_scopes,'{}'::text[]),'ends_at',p_ends_at,'report_id',v_report));

  return v_action;
end;
$$;

create or replace function public.revoke_moderation_action(p_action_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid:=auth.uid();
  v_case uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;

  update public.moderation_actions
     set status='revoked',revoked_at=now(),revoked_by=v_admin
   where id=p_action_id and status='active'
   returning case_id into v_case;
  if not found then raise exception 'active_action_not_found' using errcode='P0002'; end if;

  update public.account_restrictions set is_active=false where action_id=p_action_id;

  insert into public.moderation_audit_log(case_id,action_id,actor_id,event,payload)
  values(v_case,p_action_id,v_admin,'punishment_revoked','{}'::jsonb);
end;
$$;

revoke all on function public.open_content_report_case(uuid) from public,anon;
revoke all on function public.resolve_content_report(uuid,text,text) from public,anon;
revoke all on function public.apply_moderation_action(uuid,text,text,text[],timestamptz,text,text,uuid) from public,anon;
revoke all on function public.revoke_moderation_action(uuid) from public,anon;
grant execute on function public.open_content_report_case(uuid) to authenticated;
grant execute on function public.resolve_content_report(uuid,text,text) to authenticated;
grant execute on function public.apply_moderation_action(uuid,text,text,text[],timestamptz,text,text,uuid) to authenticated;
grant execute on function public.revoke_moderation_action(uuid) to authenticated;
