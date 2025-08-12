
'use client';

import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayer = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(async (blob: Blob) => {
    stopPlayer();
    
    return new Promise<void>((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplaying = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = (e) => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.error("Audio playback error", e);
        reject(new Error("Failed to play audio."));
      };

      audio.play().catch(err => {
        console.error("Error attempting to play audio:", err);
        reject(err);
      });
    });
  }, [stopPlayer]);

  return { isPlaying, playAudio, stopPlayer };
};
