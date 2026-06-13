import {genkit} from 'genkit';
import {openAICompatible} from '@genkit-ai/compat-oai';

const globalForGenkit = globalThis as typeof globalThis & {
  ai?: ReturnType<typeof genkit>;
};

export const ai = globalForGenkit.ai || genkit({
  plugins: [
    openAICompatible({
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
  ],
  model: 'groq/llama-3.3-70b-versatile',
});

if (process.env.NODE_ENV !== 'production') {
  globalForGenkit.ai = ai;
}
