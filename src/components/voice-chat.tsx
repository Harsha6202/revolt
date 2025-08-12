
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaRecorder } from '@/hooks/use-media-recorder';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { answerRevoltQueries } from '@/ai/flows/answer-revolt-queries';

type Status = 'idle' | 'recording' | 'processing' | 'error';

export default function VoiceChat() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const { toast } = useToast();

  const { playAudio, isPlaying } = useAudioPlayer();

  const handleAudioProcessing = useCallback(async (audioBlob: Blob) => {
    setStatus('processing');
    try {
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const revoltQueryResponse = await answerRevoltQueries({
        query: audioBase64,
        history: conversationHistory,
      });
      
      const { text, audio, history } = revoltQueryResponse;

      setTranscribedText(text);
      setAiResponseText(audio); // This is actually the AI's text response now
      setConversationHistory(history);

      if (audio) {
          const ttsResponse = await fetch('/api/gemini-live/tts', {
              method: 'POST',
              body: JSON.stringify({ text: audio }),
              headers: { 'Content-Type': 'application/json' },
          });
          if (!ttsResponse.ok || !ttsResponse.body) {
              throw new Error('Failed to get TTS audio');
          }
          const ttsAudioBlob = await ttsResponse.blob();
          await playAudio(ttsAudioBlob);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus('error');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      });
    } finally {
      if (status !== 'recording') {
        setStatus('idle');
      }
    }
  }, [playAudio, toast, status, conversationHistory]);

  const { startRecording, stopRecording, isRecording } = useMediaRecorder({ onDataAvailable: handleAudioProcessing });

  const handleStartRecording = () => {
    setTranscribedText('');
    setAiResponseText('');
    startRecording();
    setStatus('recording');
  };

  const handleStopRecording = () => {
    stopRecording();
    setStatus('processing');
  };

  useEffect(() => {
    if (!isPlaying) {
        if(status === 'processing') {
            setStatus('idle');
        }
    }
  }, [isPlaying, status]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg">
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        size="icon"
        className={cn(
          'h-24 w-24 rounded-full transition-all duration-300 ease-in-out',
          isRecording && 'bg-red-500 hover:bg-red-600 animate-pulse',
          status === 'processing' && 'bg-accent/80 cursor-not-allowed',
          status === 'error' && 'bg-destructive/80 hover:bg-destructive'
        )}
        disabled={status === 'processing' || isPlaying}
      >
        {isRecording ? <StopCircle className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
      </Button>
      <div className="w-full text-center min-h-[80px] p-4 rounded-lg bg-muted/50">
        {status === 'processing' && <p className="text-sm text-muted-foreground animate-pulse">Processing...</p>}
        {transcribedText && <p className="text-lg"><span className="font-bold">You said:</span> {transcribedText}</p>}
        {aiResponseText && <p className="text-lg mt-2"><span className="font-bold">AI:</span> {aiResponseText}</p>}
        {!transcribedText && !aiResponseText && status !== 'processing' && (
            <p className="text-muted-foreground">Press the button and start speaking.</p>
        )}
      </div>
    </div>
  );
}
