
'use client';

import { useState, useRef, useCallback } from 'react';

const MimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/opus',
];

export const useMediaRecorder = ({ onDataAvailable }: { onDataAvailable: (data: Blob) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // The 'stop' event will handle cleanup.
    }
    // also clean up tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

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

      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data);
        }
      };

      recorder.onstop = () => {
        // Clean up stream tracks when recording stops
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsRecording(false);
      };

      recorder.start(500); // Collect data in 500ms chunks
      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      // Ensure we clean up if start fails
      stopRecording();
      throw err;
    }
  }, [isRecording, onDataAvailable, stopRecording]);

  return { isRecording, startRecording, stopRecording };
};
