'use server';

import {
  displayShortlistingProbability,
  type ShortlistingProbabilityInput,
  type ShortlistingProbabilityOutput,
} from '@/ai/flows/display-shortlisting-probability';
import {
  findRelatedJobs,
  type FindRelatedJobsInput,
  type FindRelatedJobsOutput,
} from '@/ai/flows/find-related-jobs';

export async function runInitialAnalysis(data: ShortlistingProbabilityInput): Promise<{
  success: boolean;
  data?: ShortlistingProbabilityOutput;
  error?: string;
}> {
  // Check for API key existence
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Gemini API key is missing. Please set GOOGLE_GENAI_API_KEY in your .env file.',
    };
  }

  try {
    const result = await displayShortlistingProbability(data);
    
    if (!result || typeof result.shortlist_probability !== 'number') {
      return {
        success: false,
        error: 'The AI returned an incomplete response. Please try submitting again.',
      };
    }
    
    return { success: true, data: result };
  } catch (e: any) {
    console.error('Analysis error:', e);
    
    // Provide user-friendly messages for common API errors
    if (e.message?.includes('API key not valid') || e.message?.includes('400')) {
      return {
        success: false,
        error: 'Your Gemini API key appears to be invalid or expired. Please verify it in your .env file.',
      };
    }

    if (e.message?.includes('safety')) {
      return {
        success: false,
        error: 'The analysis was blocked by AI safety filters. Please try with different content.',
      };
    }

    return {
      success: false,
      error: 'Nexus engine encountered an error. Please check your connection and try again.',
    };
  }
}

export async function findRelatedJobsAction(data: FindRelatedJobsInput): Promise<{
  success: boolean;
  data?: FindRelatedJobsOutput;
  error?: string;
}> {
  try {
    const result = await findRelatedJobs(data);
    return { success: true, data: result };
  } catch (e: any) {
    console.error('Related jobs error:', e);
    return { success: false, error: 'Failed to find related opportunities.' };
  }
}
