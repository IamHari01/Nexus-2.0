import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CandidateProfile, Job, JobMatchResult } from '@/lib/job-types';

// Schema for Genkit Deep Matcher
const DeepMatchInputSchema = z.object({
  profileJson: z.string().describe('JSON stringified candidate profile'),
  jobJson: z.string().describe('JSON stringified job details')
});

const JobMatchResultSchema = z.object({
  job_id: z.string().describe('The ID of the job listing'),
  job_title: z.string().describe('The title of the job'),
  company: z.string().describe('The company offering the job'),
  location: z.string().describe('The location of the job'),
  job_link: z.string().url().describe('Direct link to the job posting'),
  score: z.number().int().min(0).max(100).describe('Overall match score (0-100)'),
  match_status: z.enum(['High', 'Medium', 'Low']).describe('Match category based on score: High (>=75), Medium (40-74), Low (<40)'),
  reasoning: z.string().describe('1-2 sentence explanation of the ATS match score, including key fit factors'),
  matched_skills: z.array(z.string()).describe('List of skills/technologies from the candidate that match the job requirements'),
  missing_skills: z.array(z.string()).describe('List of skills/technologies required by the job but missing from the resume'),
  learning_path: z.array(z.object({
    skill: z.string().describe('The name of the missing skill to learn'),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']).describe('Priority based on the job requirements'),
    youtube_query: z.string().describe('A high-intent search query to find tutorials on YouTube'),
    estimated_time: z.string().describe('Estimated time to get up to speed on this skill')
  })).describe('List of customized learning recommendations')
});

const deepMatchPrompt = ai.definePrompt({
  name: 'deepMatchPrompt',
  input: { schema: DeepMatchInputSchema },
  output: { schema: JobMatchResultSchema },
  prompt: `You are an elite ATS Match Scoring and Recommendation Agent.
  Given the candidate's parsed profile and a target job listing, perform a deep, realistic ATS compatibility analysis.
  
  Candidate Profile:
  """
  {{profileJson}}
  """
  
  Job Details:
  """
  {{jobJson}}
  """
  
  Instructions:
  1. Compare candidate's skills and technologies to the job title and requirements.
  2. Determine matched skills (skills from candidate profile present in the job description).
  3. Identify missing skills (crucial requirements in the job description that the candidate lacks).
  4. Formulate learning path recommendations to bridge the gap.
  5. Calculate a realistic compatibility score (0-100) based on:
     - 40% skills and technologies match
     - 40% experience fit (titles, years)
     - 20% location & workspace type fit
  6. Provide an honest, objective, and tactical reasoning summary.
  7. Fill out all the required JSON fields.
  `
});

// Genkit Flow for deep matching
export const deepMatchFlow = ai.defineFlow(
  {
    name: 'deepMatchFlow',
    inputSchema: DeepMatchInputSchema,
    outputSchema: JobMatchResultSchema,
  },
  async input => {
    const { output } = await deepMatchPrompt(input);
    return output!;
  }
);

/**
 * Stage 1: Fast match score based on keyword intersection
 */
export function calculateFastMatchScore(profile: CandidateProfile, job: Job): number {
  const jobText = `${job.job_title} ${job.description}`.toLowerCase();
  const allSkills = Array.from(new Set([
    ...(profile.skills || []),
    ...(profile.technologies || []),
  ])).map(s => s.toLowerCase().trim());

  if (allSkills.length === 0) return 0;

  let matchCount = 0;
  for (const skill of allSkills) {
    if (jobText.includes(skill)) {
      matchCount++;
    }
  }

  // Weight skills intersection at 70%
  const skillScore = (matchCount / allSkills.length) * 70;

  // Weight job title matching preferred roles at 30%
  let roleMatchScore = 0;
  const lowerJobTitle = job.job_title.toLowerCase();
  const preferredRoles = (profile.preferred_roles || []).map(r => r.toLowerCase().trim());
  
  for (const role of preferredRoles) {
    if (lowerJobTitle.includes(role)) {
      roleMatchScore = 30;
      break;
    }
  }

  return Math.min(Math.round(skillScore + roleMatchScore), 100);
}

/**
 * Stage 2: Orchestrate Matching Engine.
 * Run fast matching across all jobs, filter top candidates, and run deep AI matching for the top ones.
 */
export async function matchJobs(
  profile: CandidateProfile,
  jobs: Job[],
  topN: number = 4
): Promise<JobMatchResult[]> {
  console.log(`Starting Matching Engine. Matching candidate profile against ${jobs.length} jobs.`);

  // Stage 1: Fast Match Score & Sort
  const jobsWithFastScore = jobs.map(job => ({
    job,
    fastScore: calculateFastMatchScore(profile, job),
  }));

  // Sort descending by fast score
  jobsWithFastScore.sort((a, b) => b.fastScore - a.fastScore);

  // Take top N for deep AI matching (to optimize token usage and latency)
  const topJobs = jobsWithFastScore.slice(0, topN);
  
  console.log(`Stage 1 complete. Running Stage 2 (Deep AI Match) for the top ${topJobs.length} jobs.`);

  const matchResults: JobMatchResult[] = [];

  for (const item of topJobs) {
    try {
      const deepMatchOut = await deepMatchFlow({
        profileJson: JSON.stringify(profile),
        jobJson: JSON.stringify(item.job),
      });

      matchResults.push({
        ...deepMatchOut,
        job_id: item.job.id,
        job_title: item.job.job_title,
        company: item.job.company,
        location: item.job.location,
        job_link: item.job.job_link,
        matched_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`Deep AI matching failed for job: ${item.job.id}. Using fast match fallback.`, err);
      // Fallback to basic structure on error
      const score = item.fastScore;
      matchResults.push({
        job_id: item.job.id,
        job_title: item.job.job_title,
        company: item.job.company,
        location: item.job.location,
        job_link: item.job.job_link,
        score,
        match_status: score >= 75 ? 'High' : score >= 40 ? 'Medium' : 'Low',
        reasoning: 'Evaluated using fast keyword similarity engine.',
        matched_skills: [],
        missing_skills: [],
        learning_path: [],
        matched_at: new Date().toISOString(),
      });
    }
  }

  // Sort results by final match score descending
  return matchResults.sort((a, b) => b.score - a.score);
}
