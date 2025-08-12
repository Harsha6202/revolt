
'use server';

/**
 * @fileOverview An AI agent that answers questions about Revolt Motors.
 *
 * - answerRevoltQueries - A function that answers questions about Revolt Motors.
 * - AnswerRevoltQueriesInput - The input type for the answerRevoltQueries function.
 * - AnswerRevoltQueriesOutput - The return type for the answerRevoltQueries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerRevoltQueriesInputSchema = z.object({
  query: z.string().describe("A user's audio query as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  history: z.array(z.string()).optional().describe('The conversation history.'),
});
export type AnswerRevoltQueriesInput = z.infer<typeof AnswerRevoltQueriesInputSchema>;

const AnswerRevoltQueriesOutputSchema = z.object({
  text: z.string().describe('The transcribed text of the user query and the AI response.'),
  history: z.array(z.string()).describe('The updated conversation history.'),
});
export type AnswerRevoltQueriesOutput = z.infer<typeof AnswerRevoltQueriesOutputSchema>;


export async function answerRevoltQueries(input: AnswerRevoltQueriesInput): Promise<AnswerRevoltQueriesOutput> {
  return answerRevoltQueriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerRevoltQueriesPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: AnswerRevoltQueriesInputSchema},
  output: {schema: AnswerRevoltQueriesOutputSchema},
  system: 'You are an expert on Revolt Motors products and services. Only answer questions related to Revolt Motors. If a question is not about Revolt Motors, politely decline to answer. You will be given a user query as a base64 encoded audio string. First, transcribe the audio. Then, formulate a response. Then, return the transcription, your response, and the updated conversation history.',
  prompt: `Transcribe the user's audio query and provide a helpful response. The user's audio is: {{media url=query}} Conversation history: {{{history}}}`
});

const answerRevoltQueriesFlow = ai.defineFlow(
  {
    name: 'answerRevoltQueriesFlow',
    inputSchema: AnswerRevoltQueriesInputSchema,
    outputSchema: AnswerRevoltQueriesOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    return response.output!;
  }
);
