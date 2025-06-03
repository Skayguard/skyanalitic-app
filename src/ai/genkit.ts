
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

// This warning will appear in your server console (terminal) if the key is missing when the app starts.
// It won't show in the browser console.
if (!apiKey && process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  console.warn(
    '\n\n**************************************************************************************\n' +
    'WARNING: GOOGLE_API_KEY is not set in the environment variables.\n' +
    'Genkit AI features relying on the Google AI plugin will likely fail.\n' +
    'Please ensure GOOGLE_API_KEY is correctly set in your .env file (e.g., GOOGLE_API_KEY=AbCdEfG...),\n' +
    'and that the Next.js development server has been completely STOPPED and RESTARTED.\n' +
    '**************************************************************************************\n\n'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey }), // Explicitly pass the API key
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for genkit instance
});
