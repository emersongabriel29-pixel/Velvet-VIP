import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adaptive=fs.readFileSync('src/components/common/AdaptiveVideo.tsx','utf8');
const media=fs.readFileSync('src/services/media.ts','utf8');
const card=fs.readFileSync('src/components/feed/VideoCard.tsx','utf8');
const live=fs.readFileSync('src/components/live/LivePage.tsx','utf8');

test('adaptive player uses hls.js when native HLS is unavailable',()=>{
  assert.match(adaptive,/from 'hls\.js'/);
  assert.match(adaptive,/canPlayType\('application\/vnd\.apple\.mpegurl'\)/);
  assert.match(adaptive,/Hls\.isSupported\(\)/);
  assert.match(adaptive,/recoverMediaError/);
});

test('automatic long-video quality prefers the HLS manifest when available',()=>{
  assert.match(media,/adaptive_manifest/);
  assert.match(media,/application\/vnd\.apple\.mpegurl/);
  assert.match(card,/AdaptiveVideo/);
  assert.match(card,/sourceType=\{playbackType\}/);
});

test('live player also uses the adaptive video component',()=>{
  assert.match(live,/AdaptiveVideo/);
  assert.match(live,/sourceType=\{player\.selected\.type\}/);
});
