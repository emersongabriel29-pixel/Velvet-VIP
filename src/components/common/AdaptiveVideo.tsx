import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Hls from 'hls.js';

type AdaptiveVideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  sourceUrl?: string;
  sourceType?: string;
  onPlaybackError?: (message: string) => void;
};

const isHlsSource = (url?: string, type?: string) =>
  Boolean(url) && (
    String(type || '').toLowerCase().includes('mpegurl') ||
    String(url).toLowerCase().includes('.m3u8')
  );

export const AdaptiveVideo = forwardRef<HTMLVideoElement, AdaptiveVideoProps>(
  ({ sourceUrl, sourceType, onPlaybackError, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(forwardedRef, () => localRef.current as HTMLVideoElement);

    useEffect(() => {
      const video = localRef.current;
      if (!video) return;

      let hls: Hls | null = null;
      let disposed = false;

      const clearNativeSource = () => {
        video.removeAttribute('src');
        video.load();
      };

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
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal || !hls) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
            onPlaybackError?.('Não foi possível reproduzir este stream.');
            hls.destroy();
            hls = null;
          });
        } else {
          onPlaybackError?.('Este navegador não oferece suporte à transmissão HLS.');
        }
      } else {
        video.src = sourceUrl;
        video.load();
      }

      return () => {
        disposed = true;
        if (hls) hls.destroy();
        clearNativeSource();
      };
    }, [sourceUrl, sourceType, onPlaybackError]);

    return <video ref={localRef} {...props} />;
  },
);

AdaptiveVideo.displayName = 'AdaptiveVideo';
