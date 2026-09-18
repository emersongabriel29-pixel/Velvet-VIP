-- Security stage 3: private media storage and upload constraints.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('velvet-media','velvet-media',false,536870912,array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "creators upload velvet media" on storage.objects;
create policy "creators upload velvet media" on storage.objects for insert to authenticated
with check(
 bucket_id='velvet-media'
 and owner_id=auth.uid()::text
 and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.creators c where c.user_id=auth.uid() and c.is_approved=true)
 and not public.has_active_restriction('publish')
);
drop policy if exists "creators manage own velvet media" on storage.objects;
create policy "creators manage own velvet media" on storage.objects for update to authenticated
using(bucket_id='velvet-media' and owner_id=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='velvet-media' and owner_id=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text and not public.has_active_restriction('publish'));
drop policy if exists "creators delete own velvet media" on storage.objects;
create policy "creators delete own velvet media" on storage.objects for delete to authenticated
using(bucket_id='velvet-media' and owner_id=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text);
-- Deliberately no SELECT policy: playback is issued by the trusted get-video-url function using short-lived signed URLs.
