
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!req.body) {
    return new Response('Request body is required.', { status: 400 });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable not set.');
    }
    
    const { text } = await req.json();
    if (!text) {
        return new Response('Text for TTS is required.', { status: 400 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview-native-audio-dialog" });

    const audioContent = await model.generateContent({
        text,
    });
    
    if (!audioContent.audio) {
        return new Response('Failed to generate audio.', { status: 500 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'audio/webm');
    
    return new NextResponse(audioContent.audio, { status: 200, headers });

  } catch (error) {
    console.error('API route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
