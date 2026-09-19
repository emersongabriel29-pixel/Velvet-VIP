import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Hls, { ErrorTypes } from 'hls.js';

type AdaptiveVideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  sourceUrl?: string;
  sourceType?: string;
  qualityHeight?: number | null;
  onQualities?: (heights: number[]) => void;
  onPlaybackError?: (message: string) => void;
};

const isHlsSource = (url?: string, type?: string) =>
  Boolean(url) && (
    String(type || '').toLowerCase().includes('mpegurl') ||
    String(url).toLowerCase().includes('.m3u8')
  );

export const AdaptiveVideo = forwardRef<HTMLVideoElement, AdaptiveVideoProps>(
  ({ sourceUrl, sourceType, qualityHeight, onQualities, onPlaybackError, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const qualityCallbackRef = useRef(onQualities);
    const errorCallbackRef = useRef(onPlaybackError);

    useImperativeHandle(forwardedRef, () => localRef.current as HTMLVideoElement);
    useEffect(()=>{qualityCallbackRef.current=onQualities;},[onQualities]);
    useEffect(()=>{errorCallbackRef.current=onPlaybackError;},[onPlaybackError]);

    useEffect(() => {
      const video = localRef.current;
      if (!video) return;
      let hls: Hls | null = null;
      let disposed = false;

      const clearNativeSource = () => {
        video.removeAttribute('src');
        video.load();
      };

      hlsRef.current=null;
      qualityCallbackRef.current?.([]);

      if (!sourceUrl) {
        clearNativeSource();
        return;
      }

      if (isHlsSource(sourceUrl, sourceType)) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = sourceUrl;
          video.load();
        } else if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            startLevel: -1,
            capLevelToPlayerSize: true,
            maxBufferLength: 30,
            backBufferLength: 30,
          });
          hlsRef.current=hls;
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            if(disposed)return;
            const heights=[...new Set(data.levels.map(level=>Number(level.height||0)).filter(height=>height>0))].sort((a,b)=>a-b);
            qualityCallbackRef.current?.(heights);
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal || !hls) return;
            if (data.type === ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
              return;
            }
            if (data.type === ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
            errorCallbackRef.current?.('Não foi possível reproduzir este stream.');
            hls.destroy();
            hlsRef.current = null;
            hls = null;
          });
        } else {
          errorCallbackRef.current?.('Este navegador não oferece suporte à transmissão HLS.');
        }
      } else {
        video.src = sourceUrl;
        video.load();
      }

      return () => {
        disposed = true;
        if (hls) hls.destroy();
        if(hlsRef.current===hls)hlsRef.current=null;
        clearNativeSource();
      };
    }, [sourceUrl, sourceType]);

    useEffect(()=>{
      const hls=hlsRef.current;
      if(!hls)return;
      if(!qualityHeight){
        hls.currentLevel=-1;
        hls.nextLevel=-1;
        return;
      }
      const levels=hls.levels;
      if(!levels.length)return;
      let index=levels.findIndex(level=>Number(level.height)===Number(qualityHeight));
      if(index<0){
        index=levels.reduce((best,current,i)=>{
          const currentDiff=Math.abs(Number(current.height||0)-qualityHeight);
          const bestDiff=Math.abs(Number(levels[best]?.height||0)-qualityHeight);
          return currentDiff<bestDiff?i:best;
        },0);
      }
      hls.currentLevel=index;
      hls.nextLevel=index;
    },[qualityHeight]);

    return <video ref={localRef} {...props} />;
  },
);

AdaptiveVideo.displayName = 'AdaptiveVideo';
