
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
    
    const audioData = await req.arrayBuffer();
    const audioBase64 = Buffer.from(audioData).toString('base64');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const audio = {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    };
    
    const result = await model.generateContent([
        "Please transcribe the following audio. If there is no speech, return an empty response.",
        audio
    ]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ transcript: text });

  } catch (error) {
    console.error('API route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
