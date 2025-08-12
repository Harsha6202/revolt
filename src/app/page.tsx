import VoiceChat from '@/components/voice-chat';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl font-headline">
          Revolt Gemini Live Chat
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Engage in a real-time voice conversation with our AI assistant about Revolt Motors. Press the button and start talking.
        </p>
        <VoiceChat />
      </div>
    </main>
  );
}
