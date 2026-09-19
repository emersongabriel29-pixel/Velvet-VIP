import { spawn } from 'node:child_process';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function command(binary,args,{signal,timeout=600000}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],signal});
    let output='',error='';
    child.stdout.on('data',chunk=>{ output=(output+chunk).slice(-1000000); });
    child.stderr.on('data',chunk=>{ error=(error+chunk).slice(-4000); });
    const timer=setTimeout(()=>child.kill('SIGKILL'),timeout);
    child.on('error',err=>{clearTimeout(timer);reject(err);});
    child.on('close',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error(`${binary} failed (${code}): ${error}`));});
  });
}

export function ladder(width,height,maxQuality=2160) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>8192||height>8192) throw Error('invalid_dimensions');
  const edge=Math.min(width,height);
  const sizes=[360,480,720,1080,2160].filter(q=>q<=edge&&q<=maxQuality);
  if(!sizes.length) sizes.push(Math.min(edge,maxQuality));
  return sizes.map(quality=>{
    const scale=quality/edge;
    return {quality,width:Math.floor(width*scale/2)*2,height:Math.floor(height*scale/2)*2,
      bitrate:quality<=360?800:quality<=480?1400:quality<=720?2800:quality<=1080?5000:14000};
  });
}

export async function transcode(input,output,{signal,maxQuality=2160}={}) {
  const source=path.resolve(input), destination=path.resolve(output);
  if(!(await stat(source)).isFile()) throw Error('local_input_required');
  const info=JSON.parse(await command('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',source],{signal,timeout:30000}));
  const video=info.streams?.find(s=>s.codec_type==='video'&&!s.disposition?.attached_pic);
  if(!video) throw Error('video_stream_required');
  // FFmpeg applies the display rotation before scaling. Match the output geometry.
  const rotation=Number(video.tags?.rotate || video.side_data_list?.find(s=>s.rotation!==undefined)?.rotation || 0);
  if(rotation%90!==0) throw Error('unsupported_rotation');
  const duration=Number(info.format?.duration);
  if(!Number.isFinite(duration)||duration<=0||duration>21600) throw Error('invalid_duration');
  const renditions=ladder(Number(Math.abs(rotation)%180 ? video.height : video.width),Number(Math.abs(rotation)%180 ? video.width : video.height),maxQuality);
  await mkdir(destination,{recursive:true});
  const master=['#EXTM3U','#EXT-X-VERSION:3','#EXT-X-INDEPENDENT-SEGMENTS'];
  for(const rendition of renditions) {
    const folder=path.join(destination,String(rendition.quality));await mkdir(folder,{recursive:true});
    const mp4=path.join(folder,'video.mp4');
    await command('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file,pipe','-i',source,
      '-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-map_chapters','-1','-sn','-dn',
      '-vf',`scale=${rendition.width}:${rendition.height},setsar=1`,'-filter_threads','1','-threads','2',
      '-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-b:v',`${rendition.bitrate}k`,
      '-maxrate',`${rendition.bitrate}k`,'-bufsize',`${rendition.bitrate*2}k`,'-force_key_frames','expr:gte(t,n_forced*4)',
      '-sc_threshold','0','-c:a','aac','-b:a','128k','-ac','2','-movflags','+faststart',mp4],{signal});
    await command('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',mp4,'-map','0','-c','copy',
      '-f','hls','-hls_time','4','-hls_playlist_type','vod','-hls_flags','independent_segments',
      '-hls_segment_filename',path.join(folder,'segment-%05d.ts'),path.join(folder,'index.m3u8')],{signal});
    master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${(rendition.bitrate+128)*1000},RESOLUTION=${rendition.width}x${rendition.height}`,`${rendition.quality}/index.m3u8`);
  }
  await writeFile(path.join(destination,'master.m3u8'),master.join('\n')+'\n');
  await command('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-frames:v','1','-vf','scale=480:-2','-threads','1',path.join(destination,'thumbnail.jpg')],{signal});
  const result={duration,renditions,manifest:'master.m3u8',thumbnail:'thumbnail.jpg'};
  await writeFile(path.join(destination,'result.json'),JSON.stringify(result,null,2));
  return result;
}
