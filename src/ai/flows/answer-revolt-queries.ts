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
  query: z.string().describe('The question about Revolt Motors.'),
});
export type AnswerRevoltQueriesInput = z.infer<typeof AnswerRevoltQueriesInputSchema>;

const AnswerRevoltQueriesOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about Revolt Motors.'),
});
export type AnswerRevoltQueriesOutput = z.infer<typeof AnswerRevoltQueriesOutputSchema>;

export async function answerRevoltQueries(input: AnswerRevoltQueriesInput): Promise<AnswerRevoltQueriesOutput> {
  return answerRevoltQueriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerRevoltQueriesPrompt',
  input: {schema: AnswerRevoltQueriesInputSchema},
  output: {schema: AnswerRevoltQueriesOutputSchema},
  system: 'You are an expert on Revolt Motors products and services. Only answer questions related to Revolt Motors. If a question is not about Revolt Motors, politely decline to answer.',
  prompt: '{{{query}}}',
});

const answerRevoltQueriesFlow = ai.defineFlow(
  {
    name: 'answerRevoltQueriesFlow',
    inputSchema: AnswerRevoltQueriesInputSchema,
    outputSchema: AnswerRevoltQueriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
