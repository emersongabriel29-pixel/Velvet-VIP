import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const media=fs.readFileSync('src/services/media.ts','utf8');
const upload=fs.readFileSync('src/components/creator/UploadModal.tsx','utf8');
const card=fs.readFileSync('src/components/feed/VideoCard.tsx','utf8');
const signed=fs.readFileSync('supabase/functions/get-video-url/index.ts','utf8');
test('production upload uses private storage and authenticated owner path',()=>{assert.match(media,/storage\.from\('velvet-media'\)\.upload/);assert.match(media,/\$\{user\.id\}\/videos\//);assert.match(media,/storage:\/\//);});
test('upload validates media type and size',()=>{assert.match(media,/VIDEO_MIME/);assert.match(media,/512 \* 1024 \* 1024/);});
test('production modal requires a device file',()=>{assert.match(upload,/Selecione um arquivo do dispositivo/);assert.match(upload,/uploadCreatorVideo/);});
test('private playback uses edge authorization and short signed URL',()=>{assert.match(card,/getVideoPlaybackOptions/);assert.match(signed,/createSignedUrl\\(path,\\s*120\\)/);assert.match(signed,/age_verified/);});
