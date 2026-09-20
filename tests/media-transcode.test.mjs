import test from 'node:test';import assert from 'node:assert/strict';
import {ladder} from '../workers/media/transcode.mjs';
test('media ladder never upscales landscape, portrait or small inputs',()=>{
 for(const [w,h] of [[1920,1080],[1080,1920],[320,240],[3840,2160]])for(const r of ladder(w,h)){
  assert.ok(r.width<=w&&r.height<=h);assert.equal(r.width%2,0);assert.equal(r.height%2,0);
  assert.ok(Math.abs(r.width/r.height-w/h)<0.02);
 }
});
test('4K is generated only when source resolution supports it',()=>{
 assert.deepEqual(ladder(1920,1080).map(r=>r.quality),[360,480,720,1080]);
 assert.equal(ladder(3840,2160).at(-1).quality,2160);
});
test('invalid media dimensions fail before invoking encoders',()=>{
 for(const dims of [[0,720],[NaN,720],[99999,1000],[-1,1080]])assert.throws(()=>ladder(...dims));
});
