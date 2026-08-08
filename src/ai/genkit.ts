import {genkit} from 'genkit';
import {openAICompatible} from '@genkit-ai/compat-oai';
import { env } from '../lib/env';

const globalForGenkit = globalThis as typeof globalThis & {
  ai?: ReturnType<typeof genkit>;
};

export const ai = globalForGenkit.ai || genkit({
  plugins: [
    openAICompatible({
      name: 'portkey',
      apiKey: env.PORTKEY_API_KEY,
      baseURL: 'https://api.portkey.ai/v1',
    }),
  ],
  model: 'portkey/llama-3.3-70b-versatile',
});

if (env.NODE_ENV !== 'production') {
  globalForGenkit.ai = ai;
}
