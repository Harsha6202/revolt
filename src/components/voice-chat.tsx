
'use client';

import { useState, useCallback } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaRecorder } from '@/hooks/use-media-recorder';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { answerRevoltQueries } from '@/ai/flows/answer-revolt-queries';

type Status = 'idle' | 'recording' | 'processing' | 'error' | 'speaking';

export default function VoiceChat() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const { toast } = useToast();

  const onPlaybackStart = () => setStatus('speaking');
  const onPlaybackEnd = () => setStatus('idle');

  const { playAudio, stopPlayer, isPlaying } = useAudioPlayer({ 
    onPlaybackStart, 
    onPlaybackEnd 
  });

  const handleAudioProcessing = useCallback(async (audioBlob: Blob) => {
    setStatus('processing');
    try {
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const revoltQueryResponse = await answerRevoltQueries({
        query: audioBase64,
        history: conversationHistory,
      });

      const { text, history } = revoltQueryResponse;

      setTranscribedText(text);
      setAiResponseText(text);
      setConversationHistory(history);

      if (text) {
        const ttsResponse = await fetch('/api/gemini-live/tts', {
          method: 'POST',
          body: JSON.stringify({ text }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!ttsResponse.ok || !ttsResponse.body) {
          throw new Error('Failed to get TTS audio');
        }
        const ttsAudioBlob = await ttsResponse.blob();
        await playAudio(ttsAudioBlob);
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus('error');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      });
    }
  }, [playAudio, toast, conversationHistory]);

  const { startRecording, stopRecording } = useMediaRecorder({
    onDataAvailable: handleAudioProcessing,
  });

  const handleStartRecording = () => {
    if (isPlaying) {
      stopPlayer();
    }
    setTranscribedText('');
    setAiResponseText('');
    startRecording();
    setStatus('recording');
  };

  const handleStopRecording = () => {
    stopRecording();
  };
  
  const getButtonIcon = () => {
    if (status === 'recording') {
        return <StopCircle className="h-10 w-10" />;
    }
    return <Mic className="h-10 w-10" />;
  }
  
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
            if (aiResponseText) return <p className="text-lg mt-2"><span className="font-bold">AI:</span> {aiResponseText}</p>
            if (transcribedText) return <p className="text-lg"><span className="font-bold">You said:</span> {transcribedText}</p>
            return <p className="text-muted-foreground">Press the button and start speaking.</p>;
    }
  }

  const isRecording = status === 'recording';

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg">
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        size="icon"
        className={cn(
          'h-24 w-24 rounded-full transition-all duration-300 ease-in-out',
          isRecording && 'bg-red-500 hover:bg-red-600 animate-pulse',
          status === 'processing' && 'bg-accent/80 cursor-not-allowed',
          status === 'speaking' && 'bg-blue-500 hover:bg-blue-600',
          status === 'error' && 'bg-destructive/80 hover:bg-destructive'
        )}
        disabled={status === 'processing'}
      >
        {getButtonIcon()}
      </Button>
      <div className="w-full text-center min-h-[80px] p-4 rounded-lg bg-muted/50 flex items-center justify-center">
        <div>
            {getStatusText()}
        </div>
      </div>
    </div>
  );
}
