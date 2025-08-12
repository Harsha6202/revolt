'use client';

import { useState, useRef, useCallback } from 'react';

const MIME_TYPE = 'audio/webm; codecs=opus';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueue = useRef<Uint8Array[]>([]);

  const processQueue = useCallback(() => {
    if (
      chunkQueue.current.length > 0 &&
      sourceBufferRef.current &&
      !sourceBufferRef.current.updating
    ) {
      sourceBufferRef.current.appendBuffer(chunkQueue.current.shift()!);
    }
  }, []);

  const startPlayer = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
        if (audioRef.current) {
            resolve();
            return;
        }

        const audio = new Audio();
        audioRef.current = audio;

        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        audio.src = URL.createObjectURL(mediaSource);

        const onSourceOpen = () => {
            if (!mediaSourceRef.current || mediaSourceRef.current.sourceBuffers.length > 0) return;

            try {
                const sourceBuffer = mediaSource.addSourceBuffer(MIME_TYPE);
                sourceBufferRef.current = sourceBuffer;
                sourceBuffer.addEventListener('updateend', processQueue);
                resolve();
            } catch (e) {
                console.error('Error adding source buffer:', e);
                reject(e);
            }
        };

        mediaSource.addEventListener('sourceopen', onSourceOpen);

        audio.play().catch(e => {
            console.warn("Autoplay was prevented.", e);
            // On some browsers, we need a user interaction to start playing.
            // This is generally fine as the user will have clicked a button.
        });
        audio.onplaying = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
    });
  }, [processQueue]);

  const addChunk = useCallback((chunk: Uint8Array) => {
    chunkQueue.current.push(chunk);
    processQueue();
  }, [processQueue]);

  const stopPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
         // This can sometimes throw an error if the source is not active
        try { mediaSourceRef.current.endOfStream(); } catch (e) {}
      }
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (sourceBufferRef.current) {
        sourceBufferRef.current.removeEventListener('updateend', processQueue);
        sourceBufferRef.current = null;
    }
    mediaSourceRef.current = null;
    chunkQueue.current = [];
    setIsPlaying(false);
  }, [processQueue]);

  return { isPlaying, startPlayer, stopPlayer, addChunk };
};
