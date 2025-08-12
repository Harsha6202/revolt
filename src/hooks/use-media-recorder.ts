
'use client';

import { useState, useRef, useCallback } from 'react';

const MimeTypes = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/opus',
    'audio/webm',
];

export const useMediaRecorder = ({ onDataAvailable }: { onDataAvailable: (data: Blob) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (!supportedMimeType) {
        throw new Error("No supported MIME type for MediaRecorder");
      }

      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType, audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data);
        }
      };

      recorder.onstop = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };
      
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        stopRecording();
      };

      recorder.start(500); // Collect data in 500ms chunks
      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      stopRecording();
      throw err;
    }
  }, [onDataAvailable, stopRecording]);

  return { isRecording, startRecording, stopRecording };
};
