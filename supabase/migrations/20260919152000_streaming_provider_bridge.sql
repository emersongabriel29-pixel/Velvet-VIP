-- Concrete streaming/media provider bridge. Provider credentials remain Edge-only.
alter table public.media_processing_jobs
  add column if not exists provider text,
  add column if not exists provider_asset_id text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

create index if not exists media_processing_jobs_provider_asset_idx
  on public.media_processing_jobs(provider,provider_asset_id)
  where provider_asset_id is not null;

create unique index if not exists media_processing_one_provider_asset_idx
  on public.media_processing_jobs(provider,provider_asset_id)
  where provider is not null and provider_asset_id is not null;

comment on column public.media_processing_jobs.provider is 'Server-side transcoding provider identifier; never a browser credential.';
comment on column public.media_processing_jobs.provider_asset_id is 'Opaque provider media identifier used only by trusted server adapters.';
