
'use server';

/**
 * @fileOverview Analyzes captured media to generate a report summarizing technical details,
 * anomaly grade, database comparisons, and the probability of a genuine UAP event.
 *
 * - analyzeUapMedia - A function that handles the UAP media analysis process.
 * - AnalyzeUapMediaInput - The input type for the analyzeUapMedia function.
 * - AnalyzeUapMediaOutput - The return type for the analyzeUapMedia function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeUapMediaInputSchema = z.object({
  mediaDataUri: z
    .string()
    .describe(
      "A video or photo of a potential UAP, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeUapMediaInput = z.infer<typeof AnalyzeUapMediaInputSchema>;

const AnalyzeUapMediaOutputSchema = z.object({
  technicalDetails: z.string().describe('Technical details of the captured media.'),
  anomalyGrade: z.string().describe('The anomaly grade of the captured media.'),
  databaseComparisons: z.string().describe('Comparisons to existing UAP databases.'),
  probabilityOfGenuineUapEvent: z
    .number()
    .describe('The probability (0-1) of a genuine UAP event.'),
  summary: z.string().describe('A summary of the analysis.'),
});
export type AnalyzeUapMediaOutput = z.infer<typeof AnalyzeUapMediaOutputSchema>;

export async function analyzeUapMedia(input: AnalyzeUapMediaInput): Promise<AnalyzeUapMediaOutput> {
  return analyzeUapMediaFlow(input);
}

const analyzeUapMediaPrompt = ai.definePrompt({
  name: 'analyzeUapMediaPrompt',
  input: {schema: AnalyzeUapMediaInputSchema},
  output: {schema: AnalyzeUapMediaOutputSchema},
  prompt: `Responda em português do Brasil.
Você é um especialista em analisar mídias de potenciais UAP (Fenômenos Aéreos Não Identificados).
Você analisará a mídia fornecida e gerará um relatório resumindo detalhes técnicos, grau de anomalia, comparações com bancos de dados e a probabilidade de um evento UAP genuíno. Use seu conhecimento de física, análise de imagem e bancos de dados UAP existentes para fazer sua determinação. Inclua um resumo de suas descobertas.

Analise a seguinte mídia:

{{media url=mediaDataUri}}`,
});

const analyzeUapMediaFlow = ai.defineFlow(
  {
    name: 'analyzeUapMediaFlow',
    inputSchema: AnalyzeUapMediaInputSchema,
    outputSchema: AnalyzeUapMediaOutputSchema,
  },
  async input => {
    const {output} = await analyzeUapMediaPrompt(input);
    return output!;
  }
);
