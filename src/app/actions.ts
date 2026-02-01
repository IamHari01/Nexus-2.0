
'use server';

import {
  analyzeResumeAgainstJobDescription,
  type AnalyzeResumeAgainstJobDescriptionInput,
} from '@/ai/flows/ats-resume-analysis';

export async function runAnalysis(
  data: AnalyzeResumeAgainstJobDescriptionInput
) {
  try {
    const result = await analyzeResumeAgainstJobDescription(data);
    // The AI might return an object with a different shape on error
    if (typeof result.shortlist_probability !== 'number') {
      console.error("AI returned unexpected data shape:", result);
      return { success: false, error: 'AI returned an invalid response. Please check your inputs and try again.' };
    }
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to run analysis: ${errorMessage}` };
  }
}
