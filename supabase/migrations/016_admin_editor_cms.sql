create table if not exists public.app_content_settings (
 id text primary key default 'global', brand_name text not null default 'Velvet VIP', logo_url text, hero_title text, hero_subtitle text, hero_image_url text, primary_color text not null default '#e11d48',
 faq_text text, help_text text, terms_url text, privacy_url text, short_video_enabled boolean not null default true, long_video_enabled boolean not null default true, lives_enabled boolean not null default true,
 stories_enabled boolean not null default true, polls_enabled boolean not null default true, badges_enabled boolean not null default true, max_upload_mb int not null default 500, max_short_seconds int not null default 90, max_long_minutes int not null default 120,
 updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create table if not exists public.admin_change_log (
 id uuid primary key default gen_random_uuid(), entity text not null, entity_id text not null, action text not null, before_data jsonb, after_data jsonb, changed_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
alter table public.app_content_settings enable row level security; alter table public.admin_change_log enable row level security;
create policy "settings readable" on public.app_content_settings for select to authenticated using (true);
create policy "admins edit settings" on public.app_content_settings for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admins read log" on public.admin_change_log for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admins write log" on public.admin_change_log for insert to authenticated with check (changed_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
insert into public.app_content_settings(id) values('global') on conflict(id) do nothing;
