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
import { parseResume } from '@/ai/agents/resume-parser';
import { fetchJobs } from '@/ai/agents/job-fetcher';
import { matchJobs } from '@/ai/agents/matcher';
import { DBManager } from '@/lib/db';
import { RateLimitError } from '@/lib/llm-client';
import type { CandidateProfile, JobMatchResult, MultiAgentResult } from '@/lib/job-types';
import { runOrchestrator } from '@/ai/orchestrator/graph';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function runInitialAnalysis(data: ShortlistingProbabilityInput): Promise<{
  success: boolean;
  data?: ShortlistingProbabilityOutput;
  error?: string;
}> {
  // Check for API key existence
  const apiKey = process.env.GROQ_API_KEY;

  
  if (!apiKey) {
    return {
      success: false,
      error: 'Groq API key is missing. Please set GROQ_API_KEY in your .env file.',
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
    
    // Handle rate limit / quota exhaustion with user-friendly warning
    if (e instanceof RateLimitError || e?.name === 'RateLimitError') {
      return {
        success: false,
        error: e.userMessage || e.message,
      };
    }

    // Provide user-friendly messages for common API errors
    if (e.message?.includes('API key not valid') || e.message?.includes('400') || e.message?.includes('401')) {
      return {
        success: false,
        error: 'Your Groq API key appears to be invalid or expired. Please verify it in your .env file.',
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
    if (e instanceof RateLimitError || e?.name === 'RateLimitError') {
      return { success: false, error: e.userMessage || e.message };
    }
    return { success: false, error: 'Failed to find related opportunities.' };
  }
}

// NEW: Server Action for parsing a resume
export async function parseResumeAction(resumeText: string): Promise<{
  success: boolean;
  data?: CandidateProfile;
  error?: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'Groq API key is missing. Please set GROQ_API_KEY in your .env file.',
    };
  }

  try {
    const profile = await parseResume(resumeText);
    return { success: true, data: profile };
  } catch (e: any) {
    console.error('Resume parsing action error:', e);
    if (e instanceof RateLimitError || e?.name === 'RateLimitError') {
      return { success: false, error: e.userMessage || e.message };
    }
    return { success: false, error: 'Failed to parse resume content.' };
  }
}

// NEW: Server Action for fetching and matching jobs in real-time via Multi-Agent Graph
export async function fetchAndMatchJobsAction(
  resumeText: string,
  jobTitle: string,
  location: string = 'Remote',
  remoteOnly: boolean = false
): Promise<{
  success: boolean;
  result?: MultiAgentResult;
  error?: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'Groq API key is missing. Please set GROQ_API_KEY in your .env file.',
    };
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  if (!userId) {
    return {
      success: false,
      error: 'You must be logged in to analyze and match jobs.',
    };
  }

  try {
    // Run the multi-agent LangGraph orchestrator
    const result = await runOrchestrator({
      resumeText,
      jobQuery: jobTitle,
      location,
      remoteOnly
    });

    // Clear previous match results to keep feed location/criteria specific
    await DBManager.clearAllMatchResults(userId);

    // Save outputs in database for dashboard persistence
    await DBManager.saveJobs(userId, result.jobs);
    
    for (const match of result.matches) {
      await DBManager.saveMatchResult(userId, match);
    }
    
    await DBManager.saveLatestAnalysis(userId, result);

    return { success: true, result };
  } catch (e: any) {
    console.error('Job match action error:', e);
    if (e instanceof RateLimitError || e?.name === 'RateLimitError') {
      return { success: false, error: e.userMessage || e.message };
    }
    return { success: false, error: e.message || 'Failed to execute multi-agent intelligence orchestrator.' };
  }
}
