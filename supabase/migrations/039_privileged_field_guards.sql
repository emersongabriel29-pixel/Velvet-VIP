-- Harden privileged/system fields against client-side row-owner escalation.
create or replace function public.protect_creator_financial_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.gross_earnings := old.gross_earnings;
    new.available_balance := old.available_balance;
    new.total_followers := old.total_followers;
    new.total_likes := old.total_likes;
    new.total_views := old.total_views;
    new.verified := old.verified;
    new.is_approved := old.is_approved;
    new.identity_status := old.identity_status;
    new.identity_provider := old.identity_provider;
    new.identity_reference := old.identity_reference;
    new.identity_verified_at := old.identity_verified_at;
    new.content_rights_confirmed := old.content_rights_confirmed;
    new.payout_hold_until := old.payout_hold_until;
    new.subscription_share_percent := old.subscription_share_percent;
    new.tip_share_percent := old.tip_share_percent;
    new.user_id := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.id := old.id;
    new.role := old.role;
    new.age_verified := old.age_verified;
    new.age_verified_at := old.age_verified_at;
    new.age_verification_source := old.age_verification_source;
    new.age_verification_reference := old.age_verification_reference;
    new.is_blocked := old.is_blocked;
    new.is_suspended := old.is_suspended;
    new.wallet_balance := old.wallet_balance;
    new.platform_plan_id := old.platform_plan_id;
    new.birth_date := old.birth_date;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
before update on public.profiles for each row execute function public.protect_profile_privileged_fields();

create or replace function public.protect_video_system_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.creator_id := old.creator_id;
    new.views_count := old.views_count;
    new.likes_count := old.likes_count;
    new.comments_count := old.comments_count;
    new.favorites_count := old.favorites_count;
    new.moderation_status := old.moderation_status;
    new.moderation_notes := old.moderation_notes;
    new.moderation_score := old.moderation_score;
    new.ai_moderation_label := old.ai_moderation_label;
    new.ai_moderation_confidence := old.ai_moderation_confidence;
    new.moderation_review_reason := old.moderation_review_reason;
    new.processing_status := old.processing_status;
    new.media_status := old.media_status;
    new.media_error := old.media_error;
    new.source_storage_path := old.source_storage_path;
    new.hls_manifest_path := old.hls_manifest_path;
    new.hls_storage_path := old.hls_storage_path;
    new.video_url := old.video_url;
    new.watermark_enabled := old.watermark_enabled;
    if old.is_removed then new.is_removed := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_video_system_fields on public.videos;
create trigger protect_video_system_fields before update on public.videos
for each row execute function public.protect_video_system_fields();

create or replace function public.initialize_video_system_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.views_count := 0; new.likes_count := 0; new.comments_count := 0; new.favorites_count := 0;
    new.is_removed := false;
    new.moderation_status := 'pending';
    new.moderation_notes := null; new.moderation_score := null;
    new.ai_moderation_label := null; new.ai_moderation_confidence := null; new.moderation_review_reason := null;
    new.hls_manifest_path := null; new.hls_storage_path := null; new.media_error := null;
    new.watermark_enabled := true;
  end if;
  return new;
end $$;
drop trigger if exists initialize_video_system_fields on public.videos;
create trigger initialize_video_system_fields before insert on public.videos
for each row execute function public.initialize_video_system_fields();

create or replace function public.protect_live_system_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='UPDATE' and coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.creator_id := old.creator_id;
    new.moderation_status := old.moderation_status;
    new.streaming_provider := old.streaming_provider;
    new.streaming_room_id := old.streaming_room_id;
    new.playback_reference := old.playback_reference;
  end if;
  return new;
end $$;
drop trigger if exists protect_live_system_fields on public.live_sessions;
create trigger protect_live_system_fields before update on public.live_sessions
for each row execute function public.protect_live_system_fields();
