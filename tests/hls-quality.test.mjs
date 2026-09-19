import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const adaptive=fs.readFileSync('src/components/common/AdaptiveVideo.tsx','utf8');
const card=fs.readFileSync('src/components/feed/VideoCard.tsx','utf8');
const live=fs.readFileSync('src/components/live/LivePage.tsx','utf8');

test('HLS qualities are discovered from the real manifest',()=>{
  assert.match(adaptive,/MANIFEST_PARSED/);
  assert.match(adaptive,/data\.levels/);
  assert.match(adaptive,/qualityCallbackRef/);
});
test('automatic quality delegates to ABR and manual quality selects a real HLS level',()=>{
  assert.match(adaptive,/hls\.currentLevel=-1/);
  assert.match(adaptive,/qualityHeight/);
  assert.match(adaptive,/hls\.currentLevel=index/);
});
test('long video and live menus use discovered HLS levels',()=>{
  assert.match(card,/hlsQualities\.map/);
  assert.match(card,/qualityHeight=\{qualityHeight\}/);
  assert.match(live,/hlsQualities\.map/);
  assert.match(live,/As resoluções manuais vêm do manifesto HLS real/);
});
