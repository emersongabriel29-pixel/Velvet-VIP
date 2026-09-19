import { createClient } from '@supabase/supabase-js';
import { Upload } from 'tus-js-client';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { createWriteStream, openAsBlob } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import os from 'node:os';
import path from 'node:path';
import { transcode } from './transcode.mjs';

const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key) throw Error('SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY required');
const api=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
const stopping=new AbortController();
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>stopping.abort());
async function rpc(name,args){const {data,error}=await api.rpc(name,args);if(error) throw Error(error.code||'rpc_failed');return data;}
async function files(folder,prefix='') {
  const result=[];
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    const relative=path.posix.join(prefix,entry.name);
    if(entry.isDirectory())result.push(...await files(path.join(folder,entry.name),relative));
    else if(entry.isFile())result.push(relative);
  }
  return result;
}
function resumableEndpoint(url) {
  const parsed=new URL(url);
  if(parsed.hostname.endsWith('.supabase.co'))parsed.hostname=`${parsed.hostname.split('.')[0]}.storage.supabase.co`;
  parsed.pathname='/storage/v1/upload/resumable';parsed.search='';parsed.hash='';
  return parsed.toString();
}
async function uploadFile(file,storagePath,contentType,signal) {
  const blob=await openAsBlob(file,{type:contentType});
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);fn(value);};
    const upload=new Upload(blob,{
      endpoint:resumableEndpoint(base),chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],
      headers:{authorization:`Bearer ${key}`,'x-upsert':'false'},removeFingerprintOnSuccess:true,
      metadata:{bucketName:'velvet-media',objectName:storagePath,contentType,cacheControl:'31536000'},
      onError:error=>finish(reject,error),onSuccess:()=>finish(resolve,storagePath)
    });
    const cancel=()=>{void upload.abort(true);finish(reject,Error('worker_cancelled'));};
    if(signal?.aborted){cancel();return;}
    signal?.addEventListener('abort',cancel,{once:true});upload.start();
  });
}
async function run(job) {
  const temp=await mkdtemp(path.join(os.tmpdir(),'velvet-media-'));
  const abort=new AbortController();
  const stop=()=>abort.abort();stopping.signal.addEventListener('abort',stop,{once:true});
  let lost=false,beating=false;
  const heartbeat=setInterval(async()=>{
    if(beating)return;beating=true;
    try {if(!await rpc('heartbeat_media_job',{p_id:job.id,p_token:job.worker_token}))throw Error('lease_lost');}
    catch {lost=true;abort.abort();}finally{beating=false;}
  },30000);
  const uploaded=[];
  let finalizing=false;
  try {
    const {data,error}=await api.storage.from('velvet-media').createSignedUrl(job.source_path,120);
    if(error||!data?.signedUrl)throw Error('source_unavailable');
    const response=await fetch(data.signedUrl,{signal:abort.signal});
    if(!response.ok||!response.body)throw Error('source_download_failed');
    let bytes=0;
    const limit=new Transform({transform(chunk,_encoding,callback){bytes+=chunk.length;callback(bytes>512*1024*1024?Error('source_too_large'):null,chunk);}});
    const source=path.join(temp,'source');
    await pipeline(Readable.fromWeb(response.body),limit,createWriteStream(source),{signal:abort.signal});
    const output=path.join(temp,'output');
    const result=await transcode(source,output,{signal:abort.signal});
    const owner=job.source_path.split('/')[0];
    const prefix=`${owner}/renditions/${job.video_id}/${job.worker_token}`;
    for(const relative of await files(output)) {
      if(abort.signal.aborted)throw Error('worker_cancelled');
      if(relative==='result.json')continue;
      const storagePath=`${prefix}/${relative}`;
      const contentType=relative.endsWith('.mp4')?'video/mp4':relative.endsWith('.ts')?'video/mp2t':relative.endsWith('.jpg')?'image/jpeg':'application/vnd.apple.mpegurl';
      await uploadFile(path.join(output,relative),storagePath,contentType,abort.signal).catch(()=>{throw Error('rendition_upload_failed');});
      uploaded.push(storagePath);
    }
    finalizing=true;
    await rpc('finish_media_job',{p_id:job.id,p_token:job.worker_token,p_renditions:result.renditions.map(r=>({
      label:r.quality===2160?'4K':`${r.quality}p`,height:r.height,width:r.width,type:'video/mp4',storage_path:`${prefix}/${r.quality}/video.mp4`
    })),p_archive_manifest:`${prefix}/master.m3u8`});
    console.log(JSON.stringify({event:'media_ready',job_id:job.id,qualities:result.renditions.length}));
  } catch(error) {
    // Stale workers never update another attempt or remove its objects.
    if(!lost) await rpc('fail_media_job',{p_id:job.id,p_token:job.worker_token,p_error:stopping.signal.aborted?'worker_stopped':'processing_failed'}).catch(()=>{});
    if(uploaded.length&&!finalizing)await api.storage.from('velvet-media').remove(uploaded);
    console.error(JSON.stringify({event:'media_failed',job_id:job.id,code:lost?'lease_lost':'processing_failed'}));
  } finally {clearInterval(heartbeat);stopping.signal.removeEventListener('abort',stop);await rm(temp,{recursive:true,force:true});}
}
do {
  const job=await rpc('claim_media_job',{});
  if(job)await run(job);
  if(process.argv.includes('--once')||stopping.signal.aborted)break;
  await new Promise(resolve=>{const timer=setTimeout(done,5000);function done(){clearTimeout(timer);stopping.signal.removeEventListener('abort',done);resolve();}stopping.signal.addEventListener('abort',done,{once:true});});
} while(!stopping.signal.aborted);
