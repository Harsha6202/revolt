
'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaRecorder } from '@/hooks/use-media-recorder';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'connecting' | 'recording' | 'error';

export default function VoiceChat() {
  const [status, setStatus] = useState<Status>('idle');
  const [statusText, setStatusText] = useState('Tap to speak');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const requestStreamController = useRef<ReadableStreamDefaultController<any> | null>(null);

  const { startPlayer, stopPlayer, addChunk } = useAudioPlayer();

  const handleDataAvailable = useCallback((data: Blob) => {
    if (requestStreamController.current) {
      requestStreamController.current.enqueue(data);
    }
  }, []);
  
  const { startRecording, stopRecording } = useMediaRecorder({ onDataAvailable: handleDataAvailable });

  const stopConversation = useCallback(() => {
    setStatus('idle');
    setStatusText('Tap to speak');
    stopRecording();
    stopPlayer();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (requestStreamController.current) {
      try {
        requestStreamController.current.close();
      } catch (e) {
        // Ignore if already closed
      }
      requestStreamController.current = null;
    }
  }, [stopRecording, stopPlayer]);

  const startConversation = async () => {
    setStatus('connecting');
    setStatusText('Connecting...');
    abortControllerRef.current = new AbortController();

    try {
      await startRecording();

      const requestStream = new ReadableStream({
        start(controller) {
          requestStreamController.current = controller;
        },
      });

      const response = await fetch('/api/gemini-live', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm;codecs=opus' },
        body: requestStream,
        signal: abortControllerRef.current.signal,
        duplex: 'half',
      } as RequestInit);

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      setStatus('recording');
      setStatusText('Listening...');

      await startPlayer();
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        addChunk(value);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Conversation error:', error);
        setStatus('error');
        setStatusText('Connection failed. Please try again.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not establish connection with the voice service.",
        });
      }
    } finally {
      stopConversation();
    }
  };

  const toggleConversation = () => {
    if (status === 'idle' || status === 'error') {
      startConversation();
    } else {
      stopConversation();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Button
        onClick={toggleConversation}
        size="icon"
        className={cn(
            'h-24 w-24 rounded-full transition-all duration-300 ease-in-out',
            status === 'recording' && 'bg-accent/80 hover:bg-accent animate-pulse ring-4 ring-accent/50',
            status === 'error' && 'bg-destructive/80 hover:bg-destructive',
            status === 'connecting' && 'cursor-not-allowed'
        )}
        disabled={status === 'connecting'}
      >
        <Mic className="h-10 w-10" />
      </Button>
      <p className="text-muted-foreground">{statusText}</p>
    </div>
  );
}
