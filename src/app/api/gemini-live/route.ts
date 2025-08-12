
import { answerRevoltQueries } from '@/ai/flows/answer-revolt-queries';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!req.body) {
    return new Response('Request body is required.', { status: 400 });
  }

  try {
    const { audio: audioBase64, history } = await req.json();

    if (!audioBase64) {
      return new Response('Audio data is required.', { status: 400 });
    }
    
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
