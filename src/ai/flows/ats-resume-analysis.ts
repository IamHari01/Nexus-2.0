'use server';

/**
 * @fileOverview An ATS resume analysis AI agent.
 *
 * - analyzeResumeAgainstJobDescription - A function that handles the resume analysis process.
 * - AnalyzeResumeAgainstJobDescriptionInput - The input type for the analyzeResumeAgainstJobDescription function.
 * - AnalyzeResumeAgainstJobDescriptionOutput - The return type for the analyzeResumeAgainstJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeAgainstJobDescriptionInputSchema = z.object({
  resumeText: z.string().describe('The text content of the candidate\'s resume.'),
  jobDescription: z.string().describe('The job description to compare the resume against.'),
  targetJobTitle: z.string().describe('The target job title for the candidate.'),
  targetLocation: z.string().describe('The target location for the job.'),
  careerLevel: z
    .string()
    .optional()
    .describe('Optional: Career Level (Student / Intern / Junior / Mid / Senior)'),
});
export type AnalyzeResumeAgainstJobDescriptionInput = z.infer<
  typeof AnalyzeResumeAgainstJobDescriptionInputSchema
>;

const AnalyzeResumeAgainstJobDescriptionOutputSchema = z.object({
  job_id: z.string().describe('Unique identifier for the job listing.'),
  company: z.string().describe('The company offering the job.'),
  job_title: z.string().describe('The title of the job.'),
  location: z.string().describe('The location of the job.'),
  shortlist_probability: z
    .number()
    .int()
    .min(0)
    .max(99)
    .describe('Probability (0-99) of being shortlisted by an ATS.'),
  match_status: z.enum(['High', 'Medium', 'Low']).describe('Overall match status.'),
  reasoning: z.string().describe('A 1-2 sentence ATS-style explanation of the score.'),
  matched_skills: z.array(z.string()).describe('List of skills matched in the resume.'),
  missing_skills: z.array(z.string()).describe('List of skills missing from the resume.'),
  learning_path: z
    .array(
      z.object({
        skill: z.string().describe('The missing skill to learn.'),
        priority: z.enum(['Critical', 'High', 'Medium', 'Low']).describe('Priority of learning the skill.'),
        youtube_query: z.string().describe('A YouTube search query for learning the skill.'),
        estimated_time: z.string().describe('Estimated time to learn the skill (e.g., 8-10 hours).'),
      })
    )
    .describe('Recommended learning path to bridge the skill gaps.'),
  job_link: z.string().url().describe('URL to the job listing.'),
});
export type AnalyzeResumeAgainstJobDescriptionOutput = z.infer<
  typeof AnalyzeResumeAgainstJobDescriptionOutputSchema
>;

export async function analyzeResumeAgainstJobDescription(
  input: AnalyzeResumeAgainstJobDescriptionInput
): Promise<AnalyzeResumeAgainstJobDescriptionOutput> {
  return analyzeResumeAgainstJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'atsResumeAnalysisPrompt',
  input: {schema: AnalyzeResumeAgainstJobDescriptionInputSchema},
  output: {schema: AnalyzeResumeAgainstJobDescriptionOutputSchema},
  prompt: `You are an Autonomous Career Intelligence System. Your task is to analyze a candidate's resume against a specific job description and simulate an ATS system to predict shortlisting probability.

  Here's the candidate's resume:
  {{resumeText}}

  Here's the job description:
  {{jobDescription}}

  Target Job Title: {{targetJobTitle}}
  Target Location: {{targetLocation}}
  Career Level: {{careerLevel}}

  Instructions:

  1.  ATS Scoring Agent: Perform an ATS-grade semantic matching, focusing on contextual understanding, not just keyword matching.
  \t*   Penalize missing hard requirements.
  \t*   Reward project-level evidence.
  \t*   Infer hidden skills from experience.
  2.  Gap Analysis Agent:
  \t*   Identify exact missing skills.
  \t*   Classify gaps into Hard Skills, Experience Gaps, and Tooling/Workflow gaps.
  \t*   Explain why the candidate was rejected (if score < 85).
  3.  Learning Pathfinder Agent: Generate a job-specific learning path. Recommend YouTube channels/playlists, docs, and mini-projects. Optimize for shortlisting, not theory. Prefer hands-on content and 2024-2026 material.

  Output Format (Strict JSON):
  \t*   Ensure the output is a valid JSON object matching the schema.
  \t*   job_id: A string.
  \t*   company: A string.
  \t*   job_title: A string.
  \t*   location: A string.
  \t*   shortlist_probability: An integer between 0 and 99.
  \t*   match_status: \"High\", \"Medium\", or \"Low\".
  \t*   reasoning: A 1-2 sentence ATS-style explanation.
  \t*   matched_skills: An array of strings.
  \t*   missing_skills: An array of strings.
  \t*   learning_path: An array of learning resources with skill, priority, youtube_query, and estimated_time.
  \t*   job_link: A valid URL.

  Behavioral Rules:
  \t*   Never inflate skills or encourage mass applications.
  \t*   Never show expired jobs.
  \t*   Always explain why a score is high or low.
  \t*   Treat each job like a product launch.
  \t*   Be empathetic.
  \t*   Optimize for real-world hiring outcomes.
  ATS Scoring Philosophy:
  \t*   30% Skill Match (semantic)
  \t*   30% Experience Depth
  \t*   20% Tooling / Workflow familiarity
  \t*   20% Industry context & projects
  If resume says \"Python\", but JD needs \"Scaling Python APIs\", score it low unless evidence exists.

  Example Output:
  {
  \"job_id\": \"12345\",
  \"company\": \"Acme Corp\",
  \"job_title\": \"Software Engineer\",
  \"location\": \"San Francisco\",
  \"shortlist_probability\": 87,
  \"match_status\": \"High\",
  \"reasoning\": \"The candidate demonstrates strong Python skills and experience with relevant projects.\",
  \"matched_skills\": [\"Python\", \"SQL\"],
  \"missing_skills\": [\"Docker\", \"CI/CD\"],
  \"learning_path\": [
  {
  \"skill\": \"Docker\",
  \"priority\": \"Critical\",
  \"youtube_query\": \"Docker for backend developers full course\",
  \"estimated_time\": \"8-10 hours\"
  }
  ],
  \"job_link\": \"https://example.com/jobs/12345\"
  }
  `,
});

const analyzeResumeAgainstJobDescriptionFlow = ai.defineFlow(
  {
    name: 'analyzeResumeAgainstJobDescriptionFlow',
    inputSchema: AnalyzeResumeAgainstJobDescriptionInputSchema,
    outputSchema: AnalyzeResumeAgainstJobDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
