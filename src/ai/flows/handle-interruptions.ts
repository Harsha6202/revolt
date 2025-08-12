'use server';

/**
 * @fileOverview This file defines a Genkit flow to handle user interruptions during a voice conversation with an AI assistant.
 *
 * The flow takes the current conversation state and a new user audio input as input, and returns the AI's response, handling interruptions smoothly.
 *
 * @exports handleInterruptions - The main function to handle user interruptions.
 * @exports HandleInterruptionsInput - The input type for the handleInterruptions function.
 * @exports HandleInterruptionsOutput - The return type for the handleInterruptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandleInterruptionsInputSchema = z.object({
  conversationState: z.any().describe('The current state of the conversation.'),
  userAudioInput: z
    .string()
    .describe(
      'The user audio input as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type HandleInterruptionsInput = z.infer<typeof HandleInterruptionsInputSchema>;

const HandleInterruptionsOutputSchema = z.object({
  aiResponse: z.string().describe('The AI’s text response to the user input.'),
});
export type HandleInterruptionsOutput = z.infer<typeof HandleInterruptionsOutputSchema>;

export async function handleInterruptions(input: HandleInterruptionsInput): Promise<HandleInterruptionsOutput> {
  return handleInterruptionsFlow(input);
}

const handleInterruptionsPrompt = ai.definePrompt({
  name: 'handleInterruptionsPrompt',
  input: {schema: HandleInterruptionsInputSchema},
  output: {schema: HandleInterruptionsOutputSchema},
  prompt: `You are a helpful AI assistant specializing in information about Revolt Motors.

  The user is currently in a conversation with you. Their current message is: {{userAudioInput}}
  
  Previous conversation state: {{conversationState}}
  
  Respond to the user, taking into account the previous conversation state and their current message.
  If the user interrupts you, stop your current response and respond to the new input appropriately.
  Limit all your responses and answers to Revolt Motors content only.`,
});

const handleInterruptionsFlow = ai.defineFlow(
  {
    name: 'handleInterruptionsFlow',
    inputSchema: HandleInterruptionsInputSchema,
    outputSchema: HandleInterruptionsOutputSchema,
  },
  async input => {
    const {output} = await handleInterruptionsPrompt(input);
    return output!;
  }
);
