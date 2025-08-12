
'use client';

import { useState, useCallback, useRef } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaRecorder } from '@/hooks/use-media-recorder';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnswerRevoltQueriesOutput } from '@/ai/flows/answer-revolt-queries';

type Status = 'idle' | 'recording' | 'processing' | 'error' | 'speaking';

export default function VoiceChat() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const stopPlayerRef = useRef<() => void>(() => {});

  const onPlaybackStart = useCallback(() => setStatus('speaking'), []);
  const onPlaybackEnd = useCallback(() => setStatus('idle'), []);

  const { playStream, isPlaying } = useAudioPlayer({
    onPlaybackStart,
    onPlaybackEnd,
  });

  const handleAudioProcessing = useCallback(
    async (audioBlob: Blob) => {
      setStatus('processing');
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('history', JSON.stringify(conversationHistory));

        const response = await fetch('/api/gemini-live', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API request failed');
        }

        const revoltQueryResponse: AnswerRevoltQueriesOutput =
          await response.json();

        const { text, history } = revoltQueryResponse;
        if (!text) {
          setStatus('idle');
          toast({
            title: 'No response',
            description: 'The AI did not provide a response.',
          });
          return;
        }

        setTranscribedText(text);
        setAiResponseText(text);
        setConversationHistory(history);

        const ttsResponse = await fetch('/api/gemini-live/tts', {
          method: 'POST',
          body: JSON.stringify({ text }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!ttsResponse.ok || !ttsResponse.body) {
          const errorData = await ttsResponse.json();
          throw new Error(errorData.error || 'Failed to get TTS audio stream');
        }

        const { stop } = await playStream(ttsResponse.body);
        stopPlayerRef.current = stop;

      } catch (error) {
        console.error('Error processing audio:', error);
        setStatus('error');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: (error as Error).message,
        });
        setStatus('idle');
      }
    },
    [playStream, toast, conversationHistory]
  );

  const { startRecording, stopRecording, isRecording } = useMediaRecorder({
    onDataAvailable: handleAudioProcessing,
    onStart: () => setStatus('recording'),
    onStop: () => setStatus('processing'),
    onError: (error) => {
       toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: error.message,
      });
      setStatus('idle');
    }
  });

  const handleStartRecording = () => {
    if (isPlaying) {
      stopPlayerRef.current();
    }
    setTranscribedText('');
    setAiResponseText('');
    startRecording();
  };

  const getButtonIcon = () => {
    if (status === 'recording' || status === 'speaking' || status === 'processing') {
      return <StopCircle className="h-10 w-10" />;
    }
    return <Mic className="h-10 w-10" />;
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>;
      case 'speaking':
        return <p className="text-sm text-muted-foreground animate-pulse">Speaking...</p>;
      case 'recording':
        return <p className="text-sm text-muted-foreground animate-pulse">Listening...</p>;
      case 'error':
        return <p className="text-sm text-destructive">An error occurred. Please try again.</p>;
      default:
        if (aiResponseText)
          return (
            <p className="text-lg mt-2">
              <span className="font-bold">AI:</span> {aiResponseText}
            </p>
          );
        if (transcribedText)
          return (
            <p className="text-lg">
              <span className="font-bold">You said:</span> {transcribedText}
            </p>
          );
        return <p className="text-muted-foreground">Press the button and start speaking.</p>;
    }
  };

  const handleButtonClick = () => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'speaking' || status === 'processing') {
      stopPlayerRef.current();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg">
      <Button
        onClick={handleButtonClick}
        size="icon"
        className={cn(
          'h-24 w-24 rounded-full transition-all duration-300 ease-in-out',
          isRecording && 'bg-red-500 hover:bg-red-600 animate-pulse',
          status === 'processing' && 'bg-accent/80',
          status === 'speaking' && 'bg-blue-500 hover:bg-blue-600',
          status === 'error' && 'bg-destructive/80 hover:bg-destructive'
        )}
      >
        {getButtonIcon()}
      </Button>
      <div className="w-full text-center min-h-[80px] p-4 rounded-lg bg-muted/50 flex items-center justify-center">
        <div>{getStatusText()}</div>
      </div>
    </div>
  );
}
