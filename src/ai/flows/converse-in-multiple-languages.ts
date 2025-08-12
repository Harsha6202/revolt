'use server';
/**
 * @fileOverview Implements a Genkit flow to converse with the AI in multiple languages.
 *
 * - converseInMultipleLanguages - A function that handles the conversation in different languages.
 * - ConverseInMultipleLanguagesInput - The input type for the converseInMultipleLanguages function.
 * - ConverseInMultipleLanguagesOutput - The return type for the converseInMultipleLanguages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConverseInMultipleLanguagesInputSchema = z.object({
  userInput: z.string().describe('The user input in any language.'),
  language: z.string().optional().describe('The language of the user input. Optional.'),
});
export type ConverseInMultipleLanguagesInput = z.infer<typeof ConverseInMultipleLanguagesInputSchema>;

const ConverseInMultipleLanguagesOutputSchema = z.object({
  response: z.string().describe('The AI response in the same language as the user input.'),
});
export type ConverseInMultipleLanguagesOutput = z.infer<typeof ConverseInMultipleLanguagesOutputSchema>;

export async function converseInMultipleLanguages(input: ConverseInMultipleLanguagesInput): Promise<ConverseInMultipleLanguagesOutput> {
  return converseInMultipleLanguagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'converseInMultipleLanguagesPrompt',
  input: {schema: ConverseInMultipleLanguagesInputSchema},
  output: {schema: ConverseInMultipleLanguagesOutputSchema},
  prompt: `You are a helpful AI assistant specialized in providing information about Revolt Motors.
    You are able to understand and respond in multiple languages. The user will provide input in a language, and you should respond in the same language.

    User input: {{{userInput}}}
    `,
});

const converseInMultipleLanguagesFlow = ai.defineFlow(
  {
    name: 'converseInMultipleLanguagesFlow',
    inputSchema: ConverseInMultipleLanguagesInputSchema,
    outputSchema: ConverseInMultipleLanguagesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
