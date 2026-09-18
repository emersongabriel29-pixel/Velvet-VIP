-- Production stage 2: media lifecycle state for real private uploads.
alter table public.videos add column if not exists media_status text not null default 'ready'
  check(media_status in ('uploading','uploaded','processing','ready','failed','quarantined'));
alter table public.videos add column if not exists source_storage_path text;
alter table public.videos add column if not exists hls_storage_path text;
alter table public.videos add column if not exists media_error text;
create index if not exists videos_media_status_idx on public.videos(media_status) where media_status<>'ready';

-- New uploads are private originals. A future isolated transcoder may move them
-- through processing -> ready and populate hls_storage_path.
