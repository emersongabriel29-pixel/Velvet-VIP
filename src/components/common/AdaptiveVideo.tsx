import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Hls, { ErrorTypes } from 'hls.js';

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
    const errorCallback = useRef(onPlaybackError);
    errorCallback.current = onPlaybackError;

    useImperativeHandle(forwardedRef, () => localRef.current as HTMLVideoElement);

    useEffect(() => {
      const video = localRef.current;
      if (!video) return;

      let hls: Hls | null = null;
      let disposed = false;
      let recoveries = 0;

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
            if (data.type === ErrorTypes.NETWORK_ERROR && recoveries++ < 2) {
              hls.startLoad();
              return;
            }
            if (data.type === ErrorTypes.MEDIA_ERROR && recoveries++ < 2) {
              hls.recoverMediaError();
              return;
            }
            errorCallback.current?.('Não foi possível reproduzir este stream.');
            hls.destroy();
            hls = null;
          });
        } else {
          errorCallback.current?.('Este navegador não oferece suporte à transmissão HLS.');
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
    }, [sourceUrl, sourceType]);

    return <video ref={localRef} {...props} />;
  },
);

AdaptiveVideo.displayName = 'AdaptiveVideo';
