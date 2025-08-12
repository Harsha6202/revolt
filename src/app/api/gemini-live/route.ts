
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getResponseHeaders = () => {
  const headers = new Headers();
  headers.set('Content-Type', 'audio/webm; codecs=opus');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
};

export async function POST(req: Request) {
  if (!req.body) {
    return new Response('Request body is required.', { status: 400 });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable not set.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-preview-native-audio-dialog',
    });

    const dialog = model.beginDialog({
      systemInstruction: 'You are a helpful AI assistant specializing in information about Revolt Motors. You can converse in multiple languages. Your responses should be concise and directly related to Revolt Motors products and services. If asked about anything else, politely state that you can only discuss Revolt Motors.',
    });

    const responseStream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = responseStream.writable.getWriter();
    const reader = req.body.getReader();

    // Pipe the client's audio stream to Gemini
    const clientToGeminiPipe = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          await dialog.send(value);
        }
      } catch (error) {
        console.error('Client stream reading error:', error);
      } finally {
        // Signal to Gemini that the conversation from this side is over.
        try {
          if (dialog.state === 'ONGOING') {
             await dialog.finish();
          }
        } catch (e) {
           // Ignore if dialog is already destroyed or finished.
        }
      }
    };
    
    // Pipe Gemini's audio stream back to the client
    const geminiToClientPipe = async () => {
      try {
        for await (const chunk of dialog.stream) {
          if (chunk.audio) {
            await writer.write(chunk.audio);
          }
        }
      } catch (error) {
        console.error('Gemini stream processing error:', error);
        await writer.abort(error).catch(() => {});
      } finally {
        try {
          await writer.close();
        } catch (e) {
          // Ignore if already closed or aborted.
        }
      }
    };

    // Start both pipes concurrently. Do not await them here.
    clientToGeminiPipe();
    geminiToClientPipe();


    return new NextResponse(responseStream.readable, {
      status: 200,
      headers: getResponseHeaders(),
    });

  } catch (error) {
    console.error('API route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
