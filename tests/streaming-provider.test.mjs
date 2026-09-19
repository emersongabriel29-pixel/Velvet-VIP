import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const createLive=fs.readFileSync('supabase/functions/create-live-input/index.ts','utf8');
const syncLive=fs.readFileSync('supabase/functions/sync-live-input/index.ts','utf8');
const startMedia=fs.readFileSync('supabase/functions/start-media-processing/index.ts','utf8');
const syncMedia=fs.readFileSync('supabase/functions/sync-media-processing/index.ts','utf8');
const videoPlayback=fs.readFileSync('supabase/functions/get-video-url/index.ts','utf8');
const livePlayback=fs.readFileSync('supabase/functions/get-live-playback/index.ts','utf8');
const media=fs.readFileSync('src/services/media.ts','utf8');
const env=fs.readFileSync('.env.example','utf8');

test('Cloudflare live input is server-created and signed by default',()=>{
  assert.match(createLive,/stream\/live_inputs/);
  assert.match(createLive,/requireSignedURLs:true/);
  assert.match(createLive,/identity_status.*verified/);
  assert.match(createLive,/content_rights_confirmed/);
  assert.doesNotMatch(env,/VITE_CLOUDFLARE/);
});

test('long video is copied to provider from a short-lived private source',()=>{
  assert.match(startMedia,/createSignedUrl\(video\.source_storage_path,900\)/);
  assert.match(startMedia,/stream\/copy/);
  assert.match(startMedia,/requireSignedURLs:true/);
  assert.match(media,/start-media-processing/);
});

test('provider readiness is authoritative before media is ready',()=>{
  assert.match(syncMedia,/readyToStream===true/);
  assert.match(syncMedia,/media_status:'ready'/);
  assert.match(syncMedia,/status:'error'/);
});

test('video and live playback exchange provider IDs for short-lived tokens',()=>{
  assert.match(videoPlayback,/\/token/);
  assert.match(videoPlayback,/Math\.floor\(Date\.now\(\)\/1000\)\+300/);
  assert.match(livePlayback,/\/token/);
  assert.match(livePlayback,/Secure live playback unavailable/);
});

test('live session becomes live only after provider connection',()=>{
  assert.match(syncLive,/\['connected','reconnected'\]/);
  assert.match(syncLive,/status:'live'/);
});
