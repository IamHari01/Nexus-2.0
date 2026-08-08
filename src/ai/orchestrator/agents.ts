import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { 
  CandidateProfile, 
  Job, 
  JobMatchResult, 
  MarketTrends, 
  ResumeOptimization, 
  PersonalizedRecommendations, 
  TraceLog, 
  WordingImprovement 
} from '@/lib/job-types';
import { fetchJobs } from '@/ai/agents/job-fetcher';
import { matchJobs } from '@/ai/agents/matcher';
import { generateStructuredOutput, RateLimitError } from '@/lib/llm-client';

// ---------------------------------------------------------
// Observability / Tracing Utilities
// ---------------------------------------------------------
export function logTrace(
  logs: TraceLog[], 
  agentName: string, 
  status: 'pending' | 'success' | 'retry' | 'failed', 
  message: string, 
  confidence?: number, 
  durationMs?: number
): TraceLog[] {
  return [
    ...(logs || []),
    {
      agentName,
      status,
      message,
      timestamp: new Date().toISOString(),
      confidence,
      durationMs
    }
  ];
}

async function executeWithRetry<T>(
  nodeName: string,
  fn: () => Promise<{ output: T; confidence: number; message: string }>,
  state: { logs: TraceLog[]; retries: Record<string, number> },
  maxRetries = 2
): Promise<{ output: T; confidence: number; logs: TraceLog[]; retries: Record<string, number> }> {
  const startTime = Date.now();
  const retries = { ...(state.retries || {}) };
  let logs = [...(state.logs || [])];
  const attemptCount = retries[nodeName] || 0;

  logs = logTrace(
    logs, 
    nodeName, 
    attemptCount > 0 ? 'retry' : 'pending', 
    `Executing agent (Attempt ${attemptCount + 1}/${maxRetries + 1})...`
  );

  try {
    const res = await fn();
    const duration = Date.now() - startTime;
    logs = logTrace(logs, nodeName, 'success', res.message, res.confidence, duration);
    return {
      output: res.output,
      confidence: res.confidence,
      logs,
      retries
    };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error(`[Orchestrator] Node "${nodeName}" failed on attempt ${attemptCount + 1}`, err);

    // Rate limit errors should NOT be retried — propagate immediately
    if (err instanceof RateLimitError || (err as Error)?.name === 'RateLimitError') {
      const rateLimitErr = err as RateLimitError;
      logs = logTrace(
        logs,
        nodeName,
        'failed',
        `⚠ API quota exhausted: ${rateLimitErr.userMessage || rateLimitErr.message}`,
        0,
        duration
      );
      throw err;
    }
    
    if (attemptCount < maxRetries) {
      const errorMsg = (err as Error)?.message || String(err);
      retries[nodeName] = attemptCount + 1;
      logs = logTrace(
        logs, 
        nodeName, 
        'retry', 
        `Execution encountered error: ${errorMsg}. Retrying in 1s...`, 
        0, 
        duration
      );
      // Short delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return executeWithRetry(nodeName, fn, { logs, retries }, maxRetries);
    } else {
      const errorMsg = (err as Error)?.message || String(err);
      logs = logTrace(
        logs, 
        nodeName, 
        'failed', 
        `Agent execution failed after ${maxRetries + 1} attempts. Error: ${errorMsg}`, 
        0, 
        duration
      );
      throw err;
    }
  }
}

// ---------------------------------------------------------
// Zod Schemas for Structured Model Output
// ---------------------------------------------------------
const CandidateProfileSchema = z.object({
  name: z.string().nullable().optional().describe('Candidate name'),
  email: z.string().nullable().optional().describe('Candidate email'),
  skills: z.array(z.string()).describe('Core skills'),
  technologies: z.array(z.string()).describe('Programming languages, tools, frameworks'),
  experience_years: z.number().nullable().optional().describe('Total years of professional experience'),
  education: z.array(z.object({
    degree: z.string(),
    field_of_study: z.string().nullable().optional(),
    institution: z.string().nullable().optional(),
    graduation_year: z.string().nullable().optional()
  })).nullable().optional().describe('Education records'),
  certifications: z.array(z.string()).nullable().optional().describe('Certifications'),
  preferred_roles: z.array(z.string()).describe('Job roles matching background')
});

const MarketTrendsSchema = z.object({
  demandLevel: z.enum(['High', 'Medium', 'Low']).describe('Current market demand for this role'),
  salaryRange: z.string().describe('Typical annual salary range (e.g. $120,000 - $160,000)'),
  topHiringCompanies: z.array(z.string()).describe('Companies actively hiring for this role'),
  trendingSkills: z.array(z.string()).describe('In-demand technologies and skills for this role'),
  summary: z.string().describe('1-2 sentence overview of current market landscape')
});

const ResumeOptimizationSchema = z.object({
  summary: z.string().describe('Overall feedback on resume strengths and weaknesses'),
  skillsToHighlight: z.array(z.string()).describe('Highly relevant skills the user has but should feature more prominently'),
  wordingImprovements: z.array(z.object({
    original: z.string().describe('A weak or generic line/bullet point from the resume'),
    suggested: z.string().describe('An improved, action-oriented, metrics-driven bullet point'),
    reason: z.string().describe('Why this change helps optimize for ATS and hiring managers')
  })).describe('Actionable bullet point rewrites'),
  formattingSuggestions: z.array(z.string()).describe('Suggestions on layout, formatting, or section order')
});

const PersonalizedRecommendationsSchema = z.object({
  careerActionPlan: z.array(z.string()).describe('Step-by-step career path checklist (3-5 items)'),
  applicationStrategy: z.string().describe('Advice on how to apply to these roles (outreach hook, portfolio emphasis)'),
  interviewPrepTips: z.array(z.string()).describe('Top 3 questions or areas of focus for interviews in this domain')
});

// ---------------------------------------------------------
// Agent Node Implementation Functions
// ---------------------------------------------------------

/**
 * 1. Resume Parser Agent Node
 */
export async function runResumeParserAgent(
  resumeText: string,
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'ResumeParser';
  
  const execution = await executeWithRetry<CandidateProfile>(
    nodeName,
    async () => {
      const profile = await generateStructuredOutput({
        prompt: `Parse the following raw candidate resume text and extract a highly structured profile.
        
        Resume Content:
        """
        ${resumeText}
        """
        
        Extract name, email, skills, technologies, years of experience, education details, certifications, and preferred roles.`,
        schema: CandidateProfileSchema as unknown as z.ZodSchema<CandidateProfile>
      });
      
      // Calculate parsing confidence based on completeness of fields
      let score = 0;
      if (profile.name) score += 10;
      if (profile.email) score += 10;
      if (profile.skills && profile.skills.length > 0) score += 25;
      if (profile.technologies && profile.technologies.length > 0) score += 25;
      if (profile.experience_years !== undefined) score += 10;
      if (profile.preferred_roles && profile.preferred_roles.length > 0) score += 20;
      const confidence = score / 100;

      return {
        output: profile,
        confidence,
        message: `Parsed candidate profile successfully. Extracted ${profile.skills.length} skills, ${profile.technologies.length} technologies. Experience: ${profile.experience_years || 0} years. Confidence: ${Math.round(confidence * 100)}%`
      };
    },
    state
  );

  return {
    profile: execution.output,
    parserConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}

/**
 * 2. Job Fetcher Agent Node (integrating tool/API execution)
 */
export async function runJobFetcherAgent(
  query: string,
  location: string,
  remoteOnly: boolean,
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'JobFetcher';

  const execution = await executeWithRetry<Job[]>(
    nodeName,
    async () => {
      // Fetch live jobs from the search function
      const jobs = await fetchJobs(query, location, remoteOnly);
      
      // Determine if fallback mock generator was used
      // fetchJobs uses mock data if it returns exactly 8 mock jobs with Stripe, Vercel, Resend etc.
      // or if it prints "No live jobs found. Generating realistic matched mock jobs as fallback."
      const isFallback = jobs.some(j => j.company === 'Resend' || j.company === 'Linear' || j.company === 'Vercel');
      const confidence = isFallback ? 0.7 : 1.0;
      const sourceCount = new Set(jobs.map(j => j.source)).size;

      return {
        output: jobs,
        confidence,
        message: isFallback 
          ? `API credentials missing or rate-limited. Successfully executed mock opportunity-generator fallback, creating ${jobs.length} realistic target roles.`
          : `Fetched ${jobs.length} jobs in real-time across ${sourceCount} public feeds (JSearch, Adzuna, Remotive).`
      };
    },
    state
  );

  return {
    rawJobs: execution.output,
    fetcherConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}

/**
 * 3. Market Trend Analyzer Agent Node
 */
export async function runMarketAnalyzerAgent(
  query: string,
  location: string,
  profile: CandidateProfile,
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'MarketAnalyzer';

  const execution = await executeWithRetry<MarketTrends>(
    nodeName,
    async () => {
      const marketTrends = await generateStructuredOutput({
        prompt: `You are an elite Market Research & Salary Intelligence Agent.
        Analyze the current job market demand, hiring rates, salary ranges, top employers, and hot skills for the following job profile:
        
        Job Title Query: "${query}"
        Target Location: "${location}"
        Candidate Profile:
        - Core Skills: ${profile.skills.join(', ')}
        - Core Tech: ${profile.technologies.join(', ')}
        - Experience Years: ${profile.experience_years ?? 'Not specified'}
        
        Generate a structured analysis containing demandLevel (High/Medium/Low), salaryRange, topHiringCompanies, trendingSkills, and a market summary.`,
        schema: MarketTrendsSchema as unknown as z.ZodSchema<MarketTrends>
      });
      const confidence = 0.95; // LLM analytical confidence

      return {
        output: marketTrends,
        confidence,
        message: `Completed market intelligence analysis. Demand Level: ${marketTrends.demandLevel}. Estimated Salary: ${marketTrends.salaryRange}. Trending Skills Identified: ${marketTrends.trendingSkills.slice(0, 4).join(', ')}.`
      };
    },
    state
  );

  return {
    marketAnalysis: execution.output,
    marketConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}

/**
 * 4. Opportunity Ranker Agent Node (Fast matcher + Gemini Deep Matcher)
 */
export async function runOpportunityRankerAgent(
  profile: CandidateProfile,
  jobs: Job[],
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'OpportunityRanker';

  const execution = await executeWithRetry<JobMatchResult[]>(
    nodeName,
    async () => {
      if (!jobs || jobs.length === 0) {
        throw new Error('No jobs available to match/rank.');
      }

      // Re-use our robust two-stage matching engine
      // This runs fast scoring, selects top N, and runs deep AI matching using Gemini
      const matchResults = await matchJobs(profile, jobs, 20);
      
      // Calculate overall matching confidence
      const hasDeepScores = matchResults.some(r => r.reasoning && !r.reasoning.includes('fast keyword'));
      const confidence = hasDeepScores ? 0.95 : 0.6; // lower confidence if deep AI match crashed and fell back to keyword match
      
      const averageScore = Math.round(
        matchResults.reduce((sum, r) => sum + r.score, 0) / matchResults.length
      );

      return {
        output: matchResults,
        confidence,
        message: `Ranked and scored ${matchResults.length} opportunities. High matches: ${matchResults.filter(r => r.score >= 75).length}. Avg match score: ${averageScore}%.`
      };
    },
    state
  );

  return {
    rankedOpportunities: execution.output,
    rankerConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}

/**
 * 5. Resume Optimizer Agent Node
 */
export async function runResumeOptimizerAgent(
  profile: CandidateProfile,
  marketAnalysis: MarketTrends,
  rankedOpportunities: JobMatchResult[],
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'ResumeOptimizer';

  const execution = await executeWithRetry<ResumeOptimization>(
    nodeName,
    async () => {
      // Gather top job titles and key skill gaps from the top ranked opportunities
      const topJobsText = rankedOpportunities
        .slice(0, 2)
        .map(j => `${j.job_title} at ${j.company}: Missing Skills: [${j.missing_skills.join(', ')}]`)
        .join('\n');

      const optimization = await generateStructuredOutput({
        prompt: `You are an elite ATS Optimization and Resume Writer Agent.
        Compare the candidate's profile, target roles, and market intelligence to identify gaps and suggest tactical resume improvements.
        
        Candidate Profile:
        - Skills: ${profile.skills.join(', ')}
        - Technologies: ${profile.technologies.join(', ')}
        - Experience: ${profile.experience_years ?? 0} years
        
        Target Market Demands:
        - Trending Skills: ${marketAnalysis.trendingSkills.join(', ')}
        - Salary expectations: ${marketAnalysis.salaryRange}
        
        Top Matched Job Gaps:
        ${topJobsText}
        
        Create detailed, actionable suggestions:
        1. Formulate an overall summary evaluation.
        2. Identify candidate skills to highlight more prominently.
        3. Suggest 2-3 specific bullet-point wording rewrites (wordingImprovements) replacing a typical generic statement (original) with a metrics-driven, action-verb-oriented bullet point (suggested), explaining why (reason).
        4. Give general layout or formatting suggestions.`,
        schema: ResumeOptimizationSchema as unknown as z.ZodSchema<ResumeOptimization>
      });
      const confidence = 0.9;

      return {
        output: optimization,
        confidence,
        message: `Generated resume optimization report. Created ${optimization.wordingImprovements.length} customized wording improvements. Highlighted skills: ${optimization.skillsToHighlight.slice(0, 4).join(', ')}.`
      };
    },
    state
  );

  return {
    optimizedResumeSuggestions: execution.output,
    optimizerConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}

/**
 * 6. Recommendation Generator Agent Node
 */
export async function runRecommendationGeneratorAgent(
  profile: CandidateProfile,
  rankedOpportunities: JobMatchResult[],
  marketAnalysis: MarketTrends,
  state: { logs: TraceLog[]; retries: Record<string, number> }
) {
  const nodeName = 'RecommendationGenerator';

  const execution = await executeWithRetry<PersonalizedRecommendations>(
    nodeName,
    async () => {
      const topJob = rankedOpportunities[0];
      const jobContext = topJob 
        ? `Top target opportunity: ${topJob.job_title} at ${topJob.company} (${topJob.location}). Match score: ${topJob.score}%.`
        : 'No specific top job found.';

      const recommendations = await generateStructuredOutput({
        prompt: `You are a Career Strategist and Executive Coach Agent.
        Synthesize the candidate's profile, market conditions, and top jobs into a personalized recommendation report.
        
        Candidate Profile:
        - Experience: ${profile.experience_years ?? 0} years
        - Core Skills: ${profile.skills.join(', ')}
        - Preferred roles: ${profile.preferred_roles.join(', ')}
        
        Market Context:
        - Demand: ${marketAnalysis.demandLevel}
        - Key trending skills: ${marketAnalysis.trendingSkills.join(', ')}
        
        ${jobContext}
        
        Generate a structured personalized report:
        1. careerActionPlan: 3-5 specific, chronological next steps (e.g. upskill in X, network on LinkedIn for Y, tailor resume for Z).
        2. applicationStrategy: A precise tactic for applying to these roles (e.g., outreach message hook to hiring manager, portfolio item to highlight).
        3. interviewPrepTips: Top 3 technical/behavioral focus areas for interviews in this category.`,
        schema: PersonalizedRecommendationsSchema as unknown as z.ZodSchema<PersonalizedRecommendations>
      });
      const confidence = 0.95;

      return {
        output: recommendations,
        confidence,
        message: `Personalized Recommendations generated. Action items: ${recommendations.careerActionPlan.length}. Outreach strategy formulated.`
      };
    },
    state
  );

  return {
    personalizedRecommendations: execution.output,
    recommendationConfidence: execution.confidence,
    logs: execution.logs,
    retries: execution.retries
  };
}
