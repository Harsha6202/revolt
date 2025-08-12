
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type UseAudioPlayerProps = {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
};

export const useAudioPlayer = ({
  onPlaybackStart,
  onPlaybackEnd,
}: UseAudioPlayerProps = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isProcessingQueueRef = useRef(false);
  const stopPlaybackRef = useRef(false);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const stop = useCallback(() => {
    stopPlaybackRef.current = true;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;
    if (isPlaying) {
      setIsPlaying(false);
      onPlaybackEnd?.();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       audioContextRef.current.close();
       audioContextRef.current = null;
    }
  }, [isPlaying, onPlaybackEnd]);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0 || stopPlaybackRef.current) {
      if (!isProcessingQueueRef.current && audioQueueRef.current.length === 0 && !stopPlaybackRef.current) {
         onPlaybackEnd?.();
         setIsPlaying(false);
      }
      return;
    }

    isProcessingQueueRef.current = true;
    const audioData = audioQueueRef.current.shift();

    if (audioData && audioContextRef.current) {
      try {
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
        const sourceNode = audioContextRef.current.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContextRef.current.destination);
        sourceNodeRef.current = sourceNode;

        sourceNode.onended = () => {
          isProcessingQueueRef.current = false;
          if (!stopPlaybackRef.current) {
            processQueue();
          }
        };
        sourceNode.start();

      } catch (error) {
        console.error('Error decoding or playing audio data:', error);
        isProcessingQueueRef.current = false;
         if (!stopPlaybackRef.current) {
            processQueue();
          }
      }
    } else {
        isProcessingQueueRef.current = false;
    }
  }, [onPlaybackEnd]);


  const playStream = useCallback(async (stream: ReadableStream<Uint8Array>) => {
    stop(); 
    stopPlaybackRef.current = false;
    initializeAudioContext();
    setIsPlaying(true);
    onPlaybackStart?.();
    
    const reader = stream.getReader();

    const read = async () => {
      while (true) {
        if (stopPlaybackRef.current) {
            console.log('Playback stopped by user.');
            reader.cancel();
            break;
        }
        try {
            const { done, value } = await reader.read();
            if (done) {
                if (!isProcessingQueueRef.current) {
                  onPlaybackEnd?.();
                  setIsPlaying(false);
                }
                break;
            }
            if (value) {
                audioQueueRef.current.push(value.buffer);
                if (!isProcessingQueueRef.current) {
                    processQueue();
                }
            }
        } catch (error) {
            console.error('Error reading from stream:', error);
            if (!isProcessingQueueRef.current) {
                onPlaybackEnd?.();
                setIsPlaying(false);
            }
            break;
        }
      }
    };
    
    read();

    return { stop };

  }, [stop, initializeAudioContext, onPlaybackStart, processQueue, onPlaybackEnd]);

  return { isPlaying, playStream, stopPlayer: stop };
};
