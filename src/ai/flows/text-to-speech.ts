
'use server';
/**
 * @fileOverview Implements Genkit flows to convert text to speech.
 *
 * - textToSpeech - A function that handles converting text to speech.
 * - textToSpeechStream - A function that handles converting text to speech and streams the response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
    const { stream, response } = ai.generateStream({
      model: 'googleai/gemini-1.5-flash-preview-native-audio',
      prompt: text,
    });

    let audioChunks: Buffer[] = [];
    for await (const chunk of stream) {
      const media = chunk.output?.media;
      if (media?.url) {
        const base64Audio = media.url.split(',')[1];
        if (base64Audio) {
          audioChunks.push(Buffer.from(base64Audio, 'base64'));
        }
      }
    }
    await response;
    const finalAudio = Buffer.concat(audioChunks);
    return { audio: finalAudio.toString('base64') };
  }
);

const textToSpeechStreamingFlow = ai.defineFlow(
  {
    name: 'textToSpeechStreamingFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: z.any(),
  },
  async ({ text }) => {
    const { stream, response } = ai.generateStream({
      model: 'googleai/gemini-1.5-flash-preview-native-audio',
      prompt: text,
    });

    const nodeStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for await (const chunk of stream) {
          const media = chunk.output?.media;
          if (media?.url) {
            const base64Audio = media.url.split(',')[1];
            if (base64Audio) {
              controller.enqueue(Buffer.from(base64Audio, 'base64'));
            }
          }
        }
        await response;
        controller.close();
      },
    });

    return nodeStream;
  }
);
