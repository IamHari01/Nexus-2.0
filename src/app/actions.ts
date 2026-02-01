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
  try {
    const result = await displayShortlistingProbability(data);
    if (typeof result.shortlist_probability !== 'number') {
      console.error('AI returned unexpected data shape:', result);
      return {
        success: false,
        error: 'AI returned an invalid response. Please check your inputs and try again.',
      };
    }
    return {success: true, data: result};
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {success: false, error: `Failed to run analysis: ${errorMessage}`};
  }
}

export async function findRelatedJobsAction(data: FindRelatedJobsInput): Promise<{
  success: boolean;
  data?: FindRelatedJobsOutput;
  error?: string;
}> {
  try {
    const result = await findRelatedJobs(data);
    if (!result.related_jobs) {
      console.error('AI returned unexpected data shape for related jobs:', result);
      return {success: false, error: 'AI returned an invalid response for related jobs.'};
    }
    return {success: true, data: result};
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {success: false, error: `Failed to find related jobs: ${errorMessage}`};
  }
}
