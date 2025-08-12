
import { textToSpeechStream } from '@/ai/flows/text-to-speech';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response('Text for TTS is required.', { status: 400 });
    }

    const stream = await textToSpeechStream({ text });

    const headers = new Headers();
    headers.set('Content-Type', 'audio/webm;codecs=opus');

    return new Response(stream, { status: 200, headers });
  } catch (error) {
    console.error('API route error:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
