
'use client';

import { useState, useRef, useCallback } from 'react';

const MimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
];

export const useMediaRecorder = ({ onDataAvailable }: { onDataAvailable: (data: Blob) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (mediaRecorderRef.current) {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (!supportedMimeType) {
        throw new Error("No supported MIME type for MediaRecorder");
      }

      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data);
        }
      });
      
      recorder.start(500); // Collect data in 500ms chunks
      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      // Ensure we clean up if start fails
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);
      throw err;
    }
  }, [onDataAvailable]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording };
};
