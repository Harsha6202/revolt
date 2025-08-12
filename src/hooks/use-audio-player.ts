
'use client';

import { useState, useRef, useCallback } from 'react';

const MIME_TYPE = 'audio/webm; codecs=opus';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueue = useRef<Uint8Array[]>([]);
  
  // This ref helps manage the state of the source buffer update process.
  const isAppendingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (
      isAppendingRef.current ||
      chunkQueue.current.length === 0 ||
      !sourceBufferRef.current ||
      sourceBufferRef.current.updating
    ) {
      return;
    }

    isAppendingRef.current = true;
    const chunk = chunkQueue.current.shift();
    if (chunk) {
      try {
        sourceBufferRef.current.appendBuffer(chunk);
      } catch (e) {
        console.error('Error appending buffer:', e);
        isAppendingRef.current = false;
      }
    } else {
        isAppendingRef.current = false;
    }
  }, []);

  const onUpdateEnd = useCallback(() => {
    isAppendingRef.current = false;
    processQueue();
  }, [processQueue]);

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
        URL.revokeObjectURL(audio.src);
        mediaSource.removeEventListener('sourceopen', onSourceOpen);
        if (mediaSource.sourceBuffers.length > 0) return;

        try {
          const sourceBuffer = mediaSource.addSourceBuffer(MIME_TYPE);
          sourceBufferRef.current = sourceBuffer;
          sourceBuffer.addEventListener('updateend', onUpdateEnd);
          resolve();
        } catch (e) {
          console.error('Error adding source buffer:', e);
          reject(e);
        }
      };

      mediaSource.addEventListener('sourceopen', onSourceOpen);
      
      audio.play().catch(e => {
        console.warn("Autoplay was prevented. User interaction is needed.", e);
        // We resolve anyway, playback will start when data is added.
        resolve();
      });
      audio.onplaying = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
    });
  }, [onUpdateEnd]);

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
    if (sourceBufferRef.current) {
      sourceBufferRef.current.removeEventListener('updateend', onUpdateEnd);
      sourceBufferRef.current = null;
    }
    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
      } catch (e) {
        console.error("Error ending stream:", e);
      }
      mediaSourceRef.current = null;
    }
    chunkQueue.current = [];
    isAppendingRef.current = false;
    setIsPlaying(false);
  }, [onUpdateEnd]);

  return { isPlaying, startPlayer, stopPlayer, addChunk };
};
