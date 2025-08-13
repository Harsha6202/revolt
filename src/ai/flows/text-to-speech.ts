
'use server';
/**
 * @fileOverview Implements Genkit flows to convert text to speech.
 *
 * - textToSpeech - A function that handles converting text to speech.
 * - textToSpeechStream - A function that handles converting text to speech and streams the response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ChatSession } from '@google/generative-ai';

// Types for Gemini AI responses
interface GenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  stopSequences?: string[];
}

interface TTSResponse {
  media?: {
    url: string;
  };
}

// Helper function to create a chat session with TTS support
const createTTSChat = async (text: string) => {
  const model = ai.getModel('gemini-1.5-flash-preview-native-audio');
  const chat = model.startChat({
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });
  return chat;
};

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audio: z
    .string()
    .describe('The base64 encoded audio of the speech.'),
});
export type TextToSpeechOutput = z.infer<
  typeof TextToSpeechOutputSchema
>;

export async function textToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

export async function textToSpeechStream(
  input: TextToSpeechInput
): Promise<ReadableStream<Uint8Array>> {
  return textToSpeechStreamingFlow(input);
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text }) => {
    const chat = await createTTSChat(text);
    const response = await chat.sendMessage(text);
    const result = response.response as TTSResponse;
    
    if (result.media?.url) {
      const base64Audio = result.media.url.split(',')[1];
      if (base64Audio) {
        return { audio: base64Audio };
      }
    }
    
    throw new Error('No audio generated');
  }
);

const textToSpeechStreamingFlow = ai.defineFlow(
  {
    name: 'textToSpeechStreamingFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: z.any(),
  },
  async ({ text }) => {
    const chat = await createTTSChat(text);
    const response = chat.sendMessageStream(text);
    let stopped = false;

    const nodeStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (stopped) {
              break;
            }
            const result = chunk.response as TTSResponse;
            if (result.media?.url) {
              const base64Audio = result.media.url.split(',')[1];
              if (base64Audio) {
                controller.enqueue(Buffer.from(base64Audio, 'base64'));
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
        } finally {
          controller.close();
        }
      },
      cancel() {
        stopped = true;
        // No need for explicit abort as the stream will be cleaned up
      },
    });

    return nodeStream;
  }
);
