
import { answerRevoltQueries } from '@/ai/flows/answer-revolt-queries';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!req.body) {
    return new Response('Request body is required.', { status: 400 });
  }

  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const history = formData.get('history') ? JSON.parse(formData.get('history') as string) : [];

    if (!audioBlob) {
      return new Response('Audio data is required.', { status: 400 });
    }

    // Convert Blob to base64
    const buffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');
    const mimeType = audioBlob.type || 'audio/webm;codecs=opus';
    const audioBase64 = `data:${mimeType};base64,${base64Audio}`;
    
    const response = await answerRevoltQueries({
      query: audioBase64,
      history,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('API route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
