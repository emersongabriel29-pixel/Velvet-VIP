import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {command,transcode} from '../workers/media/transcode.mjs';
for(const [label,size,audio] of [['landscape','640x480',true],['portrait','480x640',false]]) {
 test(`real FFmpeg produces playable MP4/HLS: ${label}`,{timeout:120000},async()=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),'velvet-ffmpeg-test-'));
  try {
   const input=path.join(folder,'input.mp4');
   const args=['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',`testsrc2=size=${size}:rate=24`];
   if(audio)args.push('-f','lavfi','-i','sine=frequency=440:sample_rate=44100');
   args.push('-t','1','-c:v','libx264','-threads','1','-pix_fmt','yuv420p');if(audio)args.push('-c:a','aac');args.push(input);
   await command('ffmpeg',args);
   const output=path.join(folder,'out');const result=await transcode(input,output);
   assert.equal(result.renditions.length,2);
   const master=await readFile(path.join(output,'master.m3u8'),'utf8');
   for(const r of result.renditions){
    assert.ok(master.includes(`${r.quality}/index.m3u8`));
    const playlist=await readFile(path.join(output,`${r.quality}/index.m3u8`),'utf8');assert.match(playlist,/#EXT-X-ENDLIST/);
    for(const file of playlist.split('\n').filter(line=>line&&!line.startsWith('#')))assert.ok((await stat(path.join(output,String(r.quality),file))).size>0);
    const streams=JSON.parse(await command('ffprobe',['-v','error','-show_streams','-of','json',path.join(output,`${r.quality}/video.mp4`)])).streams;
    const video=streams.find(s=>s.codec_type==='video');assert.equal(video.width,r.width);assert.equal(video.height,r.height);
    assert.equal(streams.some(s=>s.codec_type==='audio'),audio);
   }
  }finally{await rm(folder,{recursive:true,force:true});}
 });
}
