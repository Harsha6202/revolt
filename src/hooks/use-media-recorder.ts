
'use client';

import { useState, useRef, useCallback } from 'react';

const MimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/opus',
];

type UseMediaRecorderProps = {
  onDataAvailable: (data: Blob) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
};

export const useMediaRecorder = ({
  onDataAvailable,
  onStart,
  onStop,
  onError,
}: UseMediaRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current.mimeType,
      });
      onDataAvailable(audioBlob);
    }
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    onStop?.();
  }, [onDataAvailable, onStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.warn('Recording is already in progress.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMimeType = MimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      if (!supportedMimeType) {
        throw new Error('No supported MIME type for MediaRecorder');
      }

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = handleStop;

      recorder.onerror = (event) => {
        const error = (event as any).error || new Error('MediaRecorder error');
        console.error('MediaRecorder error:', error);
        onError?.(error);
        stopRecording();
      };

      recorder.start();
      setIsRecording(true);
      onStart?.();
    } catch (err) {
      console.error('Error starting recording:', err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      onError?.(err as Error);
    }
  }, [isRecording, handleStop, onError, onStart, stopRecording]);

  return { isRecording, startRecording, stopRecording };
};
