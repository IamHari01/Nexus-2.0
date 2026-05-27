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
  // Check for API key if explicitly asked by user
  if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return {
      success: false,
      error: 'Gemini API key is missing. Please set GOOGLE_GENAI_API_KEY in your environment variables.',
    };
  }

  try {
    const result = await displayShortlistingProbability(data);
    if (typeof result.shortlist_probability !== 'number') {
      console.error('AI returned unexpected data shape:', result);
      return {
        success: false,
        error: 'AI returned an invalid response format. Please try again.',
      };
    }
    return {success: true, data: result};
  } catch (e: any) {
    console.error('Analysis error:', e);
    const errorMessage = e.message || 'An unknown error occurred during AI analysis.';
    return {success: false, error: errorMessage};
  }
}

export async function findRelatedJobsAction(data: FindRelatedJobsInput): Promise<{
  success: boolean;
  data?: FindRelatedJobsOutput;
  error?: string;
}> {
  try {
    const result = await findRelatedJobs(data);
    return {success: true, data: result};
  } catch (e: any) {
    console.error('Related jobs error:', e);
    return {success: false, error: e.message || 'Failed to fetch related job opportunities.'};
  }
}
