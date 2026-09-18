-- Anonymous playback for explicitly public, free, moderated content.
alter table public.videos
  add column if not exists anonymous_access boolean not null default false;

alter table public.videos
  drop constraint if exists videos_anonymous_access_safe_check;
alter table public.videos
  add constraint videos_anonymous_access_safe_check
  check (
    not anonymous_access
    or (
      is_premium = false
      and access_type = 'free'
      and required_tier = 'free'
      and content_level = 'sensual'
    )
  );

drop policy if exists "Conteúdo publicado exige maioridade verificada" on public.videos;
create policy "Conteúdo publicado por nível de acesso"
on public.videos for select to public
using (
  (
    anonymous_access = true
    and is_premium = false
    and access_type = 'free'
    and required_tier = 'free'
    and content_level = 'sensual'
    and moderation_status = 'approved'
    and media_status = 'ready'
    and is_draft = false
    and is_removed = false
  )
  or
  (
    public.is_age_verified()
    and (
      (is_draft = false and is_removed = false)
      or exists (
        select 1 from public.creators
        where creators.id = videos.creator_id
          and creators.user_id = auth.uid()
      )
      or public.is_admin()
    )
  )
);

comment on column public.videos.anonymous_access is
  'Explicit opt-in for anonymous playback. RLS additionally requires free, non-premium, sensual, approved, ready and published content.';
