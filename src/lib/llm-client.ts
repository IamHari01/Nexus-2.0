import { z } from 'zod';

// ---------------------------------------------------------
// Rate Limit / Quota Error Detection
// ---------------------------------------------------------

/**
 * Custom error class for rate limit and quota exhaustion scenarios.
 * Carries a user-friendly message suitable for direct display in the UI.
 */
export class RateLimitError extends Error {
  public readonly provider: string;
  public readonly retryAfterSeconds: number | null;
  public readonly userMessage: string;

  constructor(provider: string, retryAfterSeconds: number | null, rawMessage?: string) {
    const renewalInfo = retryAfterSeconds
      ? retryAfterSeconds >= 3600
        ? `Quota renews in approximately ${Math.ceil(retryAfterSeconds / 3600)} hour${Math.ceil(retryAfterSeconds / 3600) !== 1 ? 's' : ''}.`
        : retryAfterSeconds >= 60
          ? `Quota renews in approximately ${Math.ceil(retryAfterSeconds / 60)} minute${Math.ceil(retryAfterSeconds / 60) !== 1 ? 's' : ''}.`
          : `Quota renews in approximately ${retryAfterSeconds} seconds.`
      : 'Quota resets automatically — please try again later.';

    const userMessage = `Your free-tier API quota has been exhausted for ${provider}. ${renewalInfo}`;

    super(userMessage);
    this.name = 'RateLimitError';
    this.provider = provider;
    this.retryAfterSeconds = retryAfterSeconds;
    this.userMessage = userMessage;

    if (rawMessage) {
      console.warn(`[LLM Client] Rate limit details from ${provider}: ${rawMessage}`);
    }
  }
}

/** Rate-limit error keyword patterns commonly returned by LLM APIs */
const RATE_LIMIT_PATTERNS = [
  'rate_limit_exceeded',
  'rate limit',
  'quota_exceeded',
  'quota exceeded',
  'too many requests',
  'tokens_exceeded',
  'resource_exhausted',
  'request_limit_reached',
  'limit reached',
  'capacity exceeded',
];

/**
 * Checks if an error message or API response body indicates a rate limit / quota error.
 */
function isRateLimitError(statusCode: number, responseBody: string): boolean {
  if (statusCode === 429) return true;
  const lower = responseBody.toLowerCase();
  return RATE_LIMIT_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Extracts the number of seconds to wait from response headers.
 * Checks both standard `Retry-After` and vendor-specific `x-ratelimit-reset-*` headers.
 */
function extractRetryAfterSeconds(headers: Headers): number | null {
  // Standard Retry-After header (seconds or HTTP-date)
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const asNumber = Number(retryAfter);
    if (!isNaN(asNumber) && asNumber > 0) return Math.ceil(asNumber);
    // Try parsing as HTTP-date
    const asDate = Date.parse(retryAfter);
    if (!isNaN(asDate)) {
      const diffMs = asDate - Date.now();
      if (diffMs > 0) return Math.ceil(diffMs / 1000);
    }
  }

  // Vendor-specific: x-ratelimit-reset (Unix timestamp) — used by Groq, Cerebras
  const resetTimestamp = headers.get('x-ratelimit-reset');
  if (resetTimestamp) {
    const resetMs = Number(resetTimestamp) * 1000;
    if (!isNaN(resetMs)) {
      const diffMs = resetMs - Date.now();
      if (diffMs > 0) return Math.ceil(diffMs / 1000);
    }
  }

  // Groq-specific: x-ratelimit-reset-tokens or x-ratelimit-reset-requests
  for (const hdr of ['x-ratelimit-reset-tokens', 'x-ratelimit-reset-requests']) {
    const val = headers.get(hdr);
    if (val) {
      // Could be duration like "1m30s" or a timestamp
      const durationMatch = val.match(/(\d+)m(?:(\d+(?:\.\d+)?)s)?/);
      if (durationMatch) {
        const mins = parseInt(durationMatch[1], 10);
        const secs = durationMatch[2] ? parseFloat(durationMatch[2]) : 0;
        return Math.ceil(mins * 60 + secs);
      }
      const secondsMatch = val.match(/(\d+(?:\.\d+)?)s/);
      if (secondsMatch) {
        return Math.ceil(parseFloat(secondsMatch[1]));
      }
    }
  }

  return null;
}

interface LLMProvider {
  name: string;
  type: 'groq' | 'cerebras' | 'huggingface';
  apiKey: string | undefined;
  model: string;
  baseURL: string;
}

let currentProviderIndex = 0;

/**
 * Automatically converts Zod schema to a friendly JSON template representation
 * to instruct the LLM on the exact JSON schema it needs to conform to.
 */
function zodToJSONTemplate(schema: any): any {
  if (!schema) return "any";
  
  const def = schema._def;
  if (!def) return "any";
  
  const typeName = def.typeName;
  
  if (typeName === 'ZodObject') {
    const shape = schema.shape;
    const result: any = {};
    for (const key of Object.keys(shape)) {
      result[key] = zodToJSONTemplate(shape[key]);
    }
    return result;
  }
  
  if (typeName === 'ZodArray') {
    return [zodToJSONTemplate(def.type)];
  }
  
  if (typeName === 'ZodEnum') {
    return def.values.join(' | ');
  }
  
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    return zodToJSONTemplate(def.innerType);
  }
  
  if (typeName === 'ZodEffects') {
    return zodToJSONTemplate(def.schema);
  }

  // Basic types
  if (typeName === 'ZodString') return "string";
  if (typeName === 'ZodNumber') return "number";
  if (typeName === 'ZodBoolean') return "boolean";
  
  return "any";
}

export async function generateStructuredOutput<T>(params: {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodSchema<T>;
}): Promise<T> {
  // Define all available providers in preferred priority order
  const providers: LLMProvider[] = [
    {
      name: 'Groq (Primary)',
      type: 'groq' as const,
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
      baseURL: 'https://api.groq.com/openai/v1'
    },
    {
      name: 'Groq (Key 2)',
      type: 'groq' as const,
      apiKey: process.env.GROQ_API_KEY2,
      model: 'llama-3.3-70b-versatile',
      baseURL: 'https://api.groq.com/openai/v1'
    },
    {
      name: 'Groq (Key 3)',
      type: 'groq' as const,
      apiKey: process.env.GROQ_API_KEY3,
      model: 'llama-3.3-70b-versatile',
      baseURL: 'https://api.groq.com/openai/v1'
    },
    {
      name: 'Cerebras',
      type: 'cerebras' as const,
      apiKey: process.env.CEREBRAS_API_KEY,
      model: 'llama-3.3-70b',
      baseURL: 'https://api.cerebras.ai/v1'
    },
    {
      name: 'Hugging Face',
      type: 'huggingface' as const,
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      baseURL: 'https://router.huggingface.co/v1'
    }
  ].filter(p => !!p.apiKey && p.apiKey.trim() !== '');

  if (providers.length === 0) {
    throw new Error('No LLM API keys are configured in your environment (.env).');
  }

  let lastError: any = null;
  const maxAttempts = providers.length * 2; // Allow fallback cycles

  // Generate the JSON template instructions automatically
  const jsonStructureTemplate = zodToJSONTemplate(params.schema);
  const jsonInstruction = `\n\nIMPORTANT: You must return ONLY a raw JSON object conforming exactly to the following JSON structure template:\n${JSON.stringify(jsonStructureTemplate, null, 2)}\n\nDo NOT include any markdown code blocks (such as \`\`\`json), no introductory text, and no conversational wrap. Return valid JSON only.`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const providerIndex = (currentProviderIndex + attempt) % providers.length;
    const provider = providers[providerIndex];
    
    console.log(`[LLM Client] Attempting generation with provider: ${provider.name} (Model: ${provider.model})`);

    try {
      const messages = [];
      if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
      
      const userPrompt = `${params.prompt}${jsonInstruction}`;
      messages.push({ role: 'user', content: userPrompt });

      const body: any = {
        model: provider.model,
        messages,
        temperature: 0.1,
      };

      if (provider.type === 'groq' || provider.type === 'cerebras') {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${provider.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();

        // Detect rate limit / quota exhaustion errors
        if (isRateLimitError(response.status, errText)) {
          const retryAfter = extractRetryAfterSeconds(response.headers);
          console.warn(
            `[LLM Client] ⚠ Rate limit / quota exceeded on ${provider.name} (HTTP ${response.status}). ` +
            `Retry-After: ${retryAfter ?? 'unknown'}s. Response: ${errText.slice(0, 300)}`
          );
          throw new RateLimitError(provider.name, retryAfter, errText.slice(0, 500));
        }

        throw new Error(`API returned status ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const text = resJson.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Empty content in API response.');
      }

      let cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      console.log(`[LLM Client] Successfully received response from ${provider.name}. Parsing content...`);
      const parsedData = JSON.parse(cleanedText);
      const validated = params.schema.parse(parsedData);

      // Lock on this provider for subsequent requests if it succeeds
      currentProviderIndex = providerIndex;
      return validated;

    } catch (err: any) {
      console.warn(`[LLM Client] Provider ${provider.name} failed: ${err.message || JSON.stringify(err)}`);
      lastError = err;

      // If this is a rate limit error, log a clear warning and continue to next provider
      if (err instanceof RateLimitError) {
        console.warn(`[LLM Client] ⚠ ${provider.name}: Free-tier quota exhausted. Falling back to next provider...`);
      }
    }
  }

  // If the last error was a rate limit error, propagate it directly for clean UI handling
  if (lastError instanceof RateLimitError) {
    throw new RateLimitError(
      'all configured providers',
      lastError.retryAfterSeconds,
      'All LLM provider quotas have been exhausted.'
    );
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message || JSON.stringify(lastError)}`);
}
