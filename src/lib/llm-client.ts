import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { env } from './env';

let cachedSecurityPrompt: string | null = null;

function loadSecuritySystemPrompt(): string {
  if (cachedSecurityPrompt) return cachedSecurityPrompt;
  try {
    const filePath = path.join(process.cwd(), 'src/lib/NEXUS_SECURITY_SYSTEM_PROMPT.md');
    if (fs.existsSync(filePath)) {
      cachedSecurityPrompt = fs.readFileSync(filePath, 'utf-8');
      return cachedSecurityPrompt as string;
    }
  } catch (err) {
    logger.error('Failed to load security system prompt', err);
  }
  return '';
}

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
      logger.warn(`Rate limit details from ${provider}: ${rawMessage}`);
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
function zodToJSONTemplate(schema: z.ZodTypeAny): unknown {
  if (!schema) return "any";
  
  const def = schema._def;
  if (!def) return "any";
  
  const typeName = def.typeName;
  
  if (typeName === 'ZodObject') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any).shape;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      result[key] = zodToJSONTemplate(shape[key]);
    }
    return result;
  }
  
  if (typeName === 'ZodArray') {
    return [zodToJSONTemplate(def.type as z.ZodTypeAny)];
  }
  
  if (typeName === 'ZodEnum') {
    return (def as z.ZodEnumDef).values.join(' | ');
  }
  
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    return zodToJSONTemplate((def as z.ZodOptionalDef<z.ZodTypeAny>).innerType);
  }
  
  if (typeName === 'ZodEffects') {
    return zodToJSONTemplate((def as z.ZodEffectsDef<z.ZodTypeAny>).schema);
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
  const portkeyApiKey = env.PORTKEY_API_KEY;

  // Modern Portkey Integration: Define the multi-agent loadbalance & fallback config inline
  const portkeyConfig = {
    retry: {
      attempts: 5,
      on_status_codes: [429, 500, 502, 503, 504]
    },
    strategy: {
      mode: "loadbalance"
    },
    targets: [
      { virtual_key: "kubernetes-rag-1", weight: 1 },
      { virtual_key: "kubernetes-rag-2", weight: 1 },
      { virtual_key: "kubernetes-rag-3", weight: 1 },
      { virtual_key: "kubernetes-rag-4", weight: 1 }
    ]
  };

  // Generate the JSON template instructions automatically
  const jsonStructureTemplate = zodToJSONTemplate(params.schema);
  const jsonInstruction = `\n\nIMPORTANT: You must return ONLY a raw JSON object conforming exactly to the following JSON structure template:\n${JSON.stringify(jsonStructureTemplate, null, 2)}\n\nDo NOT include any markdown code blocks (such as \`\`\`json), no introductory text, and no conversational wrap. Return valid JSON only.`;

  try {
    const messages = [];
    const securitySystemPrompt = loadSecuritySystemPrompt();

    if (securitySystemPrompt) {
      const fullSystemInstruction = params.systemInstruction
        ? `${securitySystemPrompt}\n\n=========================================\nADDITIONAL AGENT CONTEXT & SPECIFICATIONS:\n${params.systemInstruction}`
        : securitySystemPrompt;
      messages.push({ role: 'system', content: fullSystemInstruction });
    } else if (params.systemInstruction) {
      messages.push({ role: 'system', content: params.systemInstruction });
    }
    
    const userPrompt = `${params.prompt}${jsonInstruction}`;
    messages.push({ role: 'user', content: userPrompt });

    const body = {
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    logger.debug(`Attempting generation with Portkey Multi-Agent Gateway`);

    const response = await fetch(`https://api.portkey.ai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${portkeyApiKey}`,
        'x-portkey-config': JSON.stringify(portkeyConfig)
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      
      // Detect rate limit / quota exhaustion errors
      if (isRateLimitError(response.status, errText)) {
        const retryAfter = extractRetryAfterSeconds(response.headers);
        logger.warn(
          `⚠ Rate limit / quota exceeded on Portkey (HTTP ${response.status}). ` +
          `Retry-After: ${retryAfter ?? 'unknown'}s. Response: ${errText.slice(0, 300)}`
        );
        throw new RateLimitError('Portkey (All Fallbacks)', retryAfter, errText.slice(0, 500));
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

    logger.debug(`Successfully received response from Portkey Gateway. Parsing content...`);
    const parsedData = JSON.parse(cleanedText);
    const validated = params.schema.parse(parsedData);

    return validated;

  } catch (err: unknown) {
    logger.error(`Portkey multi-agent generation failed:`, err);
    throw err;
  }


}
