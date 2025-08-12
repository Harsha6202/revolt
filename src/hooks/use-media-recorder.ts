
'use client';

import { useState, useRef, useCallback } from 'react';

const MimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/opus',
];

export const useMediaRecorder = ({ onDataAvailable }: { onDataAvailable: (data: Blob) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // The onstop event will handle the rest
  }, []);

  const handleStop = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType });
    onDataAvailable(audioBlob);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [onDataAvailable]);
  
  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.warn("Recording is already in progress.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (!supportedMimeType) {
        throw new Error("No supported MIME type for MediaRecorder");
      }

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = handleStop;
      
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        stopRecording();
      };

      recorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      // Clean up in case of error
      if(streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      throw err;
    }
  }, [isRecording, handleStop, stopRecording]);

  return { isRecording, startRecording, stopRecording };
};
