
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!req.body) {
    return new Response('Request body is required.', { status: 400 });
  }

  try {
    const { text } = await req.json();
    if (!text) {
        return new Response('Text for TTS is required.', { status: 400 });
    }
    
    const { audio } = await textToSpeech({ text });

    if (!audio) {
        return new Response('Failed to generate audio.', { status: 500 });
    }

    const audioBuffer = Buffer.from(audio, 'base64');
    
    const headers = new Headers();
    headers.set('Content-Type', 'audio/webm');
    
    return new NextResponse(audioBuffer, { status: 200, headers });

  } catch (error) {
    console.error('API route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
