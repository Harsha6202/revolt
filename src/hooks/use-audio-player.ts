
'use client';

import { useState, useRef, useCallback } from 'react';

type UseAudioPlayerProps = {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
};

export const useAudioPlayer = ({ onPlaybackStart, onPlaybackEnd }: UseAudioPlayerProps = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; 
      audioRef.current = null;
      if (isPlaying) {
        setIsPlaying(false);
        onPlaybackEnd?.();
      }
    }
  }, [isPlaying, onPlaybackEnd]);

  const playAudio = useCallback(async (blob: Blob) => {
    stopPlayer();
    
    return new Promise<void>((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplaying = () => {
        setIsPlaying(true);
        onPlaybackStart?.();
      };
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        onPlaybackEnd?.();
        resolve();
      };
      audio.onerror = (e) => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.error("Audio playback error", e);
        onPlaybackEnd?.();
        reject(new Error("Failed to play audio."));
      };

      audio.play().catch(err => {
        console.error("Error attempting to play audio:", err);
        onPlaybackEnd?.();
        reject(err);
      });
    });
  }, [stopPlayer, onPlaybackStart, onPlaybackEnd]);

  return { isPlaying, playAudio, stopPlayer };
};
