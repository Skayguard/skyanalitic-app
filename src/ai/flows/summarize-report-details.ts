
// Summarize the technical details, anomaly grade, database comparisons and probability of a UAP event.

'use server';

/**
 * @fileOverview Summarizes a report detailing technical details, anomaly grades,
 * database comparisons, and the probability of a UAP (Unidentified Aerial Phenomenon) event.
 *
 * - summarizeReportDetails - A function that summarizes the UAP event report.
 * - SummarizeReportDetailsInput - The input type for the summarizeReportDetails function.
 * - SummarizeReportDetailsOutput - The return type for the summarizeReportDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeReportDetailsInputSchema = z.object({
  technicalDetails: z
    .string()
    .describe('Technical details of the analyzed media, including sensor data and environmental conditions.'),
  anomalyGrade: z.string().describe('The grade of anomaly detected in the media.'),
  databaseComparisons: z
    .string()
    .describe('Comparisons against existing databases of known objects and phenomena.'),
  probabilityOfUAP: z
    .string()
    .describe('The probability of the event being a genuine UAP (Unidentified Aerial Phenomenon).'),
});
export type SummarizeReportDetailsInput = z.infer<typeof SummarizeReportDetailsInputSchema>;

const SummarizeReportDetailsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the technical details, anomaly grade, database comparisons, and probability of a UAP event.'),
});
export type SummarizeReportDetailsOutput = z.infer<typeof SummarizeReportDetailsOutputSchema>;

export async function summarizeReportDetails(input: SummarizeReportDetailsInput): Promise<SummarizeReportDetailsOutput> {
  return summarizeReportDetailsFlow(input);
}

const summarizeReportDetailsPrompt = ai.definePrompt({
  name: 'summarizeReportDetailsPrompt',
  input: {schema: SummarizeReportDetailsInputSchema},
  output: {schema: SummarizeReportDetailsOutputSchema},
  prompt: `Você é um especialista em resumir relatórios técnicos relacionados a Fenômenos Aéreos Não Identificados (UAP).
Responda em português do Brasil.
Dados os detalhes técnicos, grau de anomalia, comparações com bancos de dados e a probabilidade de um evento UAP, crie um resumo conciso.

Detalhes Técnicos: {{{technicalDetails}}}
Grau de Anomalia: {{{anomalyGrade}}}
Comparações com Banco de Dados: {{{databaseComparisons}}}
Probabilidade de Evento UAP: {{{probabilityOfUAP}}}

Resumo:`,
});

const summarizeReportDetailsFlow = ai.defineFlow(
  {
    name: 'summarizeReportDetailsFlow',
    inputSchema: SummarizeReportDetailsInputSchema,
    outputSchema: SummarizeReportDetailsOutputSchema,
  },
  async input => {
    const {output} = await summarizeReportDetailsPrompt(input);
    return output!;
  }
);
