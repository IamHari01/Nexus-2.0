import { z } from 'zod';

const envSchema = z.object({
  PORTKEY_API_KEY: z.string().min(1, 'PORTKEY_API_KEY is required'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  JSEARCH_API_KEY: z.string().optional(),
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

const processEnv = {
  PORTKEY_API_KEY: process.env.PORTKEY_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
  JSEARCH_API_KEY: process.env.JSEARCH_API_KEY,
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
};

let env: Env;

try {
  env = envSchema.parse(processEnv);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  throw error;
}

export { env };
