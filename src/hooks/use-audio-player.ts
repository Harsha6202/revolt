
'use client';

import { useState, useRef, useCallback } from 'react';

const MIME_TYPE = 'audio/webm; codecs=opus';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueue = useRef<Uint8Array[]>([]);
  const onSourceOpenRef = useRef<(() => void) | null>(null);

  const processQueue = useCallback(() => {
    if (
      chunkQueue.current.length > 0 &&
      sourceBufferRef.current &&
      !sourceBufferRef.current.updating
    ) {
      try {
        const chunk = chunkQueue.current.shift();
        if (chunk) {
          sourceBufferRef.current.appendBuffer(chunk);
        }
      } catch (e) {
        console.error('Error appending buffer:', e);
      }
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

        onSourceOpenRef.current = () => {
            if (!mediaSourceRef.current || mediaSourceRef.current.sourceBuffers.length > 0) return;
            URL.revokeObjectURL(audio.src);
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

        mediaSource.addEventListener('sourceopen', onSourceOpenRef.current);

        audio.play().catch(e => {
            console.warn("Autoplay was prevented.", e);
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
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (mediaSourceRef.current) {
        if (onSourceOpenRef.current) {
            mediaSourceRef.current.removeEventListener('sourceopen', onSourceOpenRef.current);
            onSourceOpenRef.current = null;
        }
        if (mediaSourceRef.current.readyState === 'open' && sourceBufferRef.current) {
            try { 
              if (!sourceBufferRef.current.updating) {
                mediaSourceRef.current.endOfStream(); 
              }
            } catch (e) {
              console.error("Error ending stream:", e);
            }
        }
        mediaSourceRef.current = null;
    }
    if (sourceBufferRef.current) {
        sourceBufferRef.current.removeEventListener('updateend', processQueue);
        sourceBufferRef.current = null;
    }
    chunkQueue.current = [];
    setIsPlaying(false);
  }, [processQueue]);

  return { isPlaying, startPlayer, stopPlayer, addChunk };
};
