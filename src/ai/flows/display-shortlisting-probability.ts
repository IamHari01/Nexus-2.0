'use server';

/**
 * @fileOverview A flow that calculates and displays the shortlisting probability for a candidate based on their resume and a target job description.
 *
 * - displayShortlistingProbability - A function that calculates and returns the shortlisting probability.
 * - ShortlistingProbabilityInput - The input type for the displayShortlistingProbability function.
 * - ShortlistingProbabilityOutput - The return type for the displayShortlistingProbability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShortlistingProbabilityInputSchema = z.object({
  resumeText: z.string().describe('The text content of the candidate\'s resume.'),
  jobDescription: z.string().describe('The text content of the target job description.'),
  targetJobTitle: z.string().describe('The target job title.'),
  targetLocation: z.string().describe('The target location.'),
  careerLevel: z.string().optional().describe('The career level of the candidate (e.g., Student, Intern, Junior, Mid, Senior).'),
});
export type ShortlistingProbabilityInput = z.infer<typeof ShortlistingProbabilityInputSchema>;

const ShortlistingProbabilityOutputSchema = z.object({
  job_id: z.string().describe('The ID of the job listing.'),
  company: z.string().describe('The name of the company offering the job.'),
  job_title: z.string().describe('The title of the job.'),
  location: z.string().describe('The location of the job.'),
  shortlist_probability: z.number().int().min(0).max(99).describe('The probability (0-99) of the candidate being shortlisted.'),
  match_status: z.enum(['High', 'Medium', 'Low']).describe('The overall match status between the candidate and the job.'),
  reasoning: z.string().describe('A 1-2 sentence explanation of the shortlisting probability, from an ATS perspective.'),
  matched_skills: z.string().array().describe('The skills from the resume that match the job description.'),
  missing_skills: z.string().array().describe('The skills required by the job description that are missing from the resume.'),
  learning_path: z.object({
      skill: z.string(),
      priority: z.string(),
      youtube_query: z.string(),
      estimated_time: z.string()
    }).array().describe('A list of recommended learning resources to address the skill gaps.'),
  job_link: z.string().url().describe('A link to the job posting.'),
});
export type ShortlistingProbabilityOutput = z.infer<typeof ShortlistingProbabilityOutputSchema>;

export async function displayShortlistingProbability(input: ShortlistingProbabilityInput): Promise<ShortlistingProbabilityOutput> {
  return displayShortlistingProbabilityFlow(input);
}

const displayShortlistingProbabilityPrompt = ai.definePrompt({
  name: 'displayShortlistingProbabilityPrompt',
  input: {schema: ShortlistingProbabilityInputSchema},
  output: {schema: ShortlistingProbabilityOutputSchema},
  prompt: `You are a career intelligence engine that helps users actually get shortlisted.

  Given the following resume and job description, assess the candidate\'s fit and provide a shortlisting probability.

  Resume:
  {{resumeText}}

  Job Description:
  {{jobDescription}}

  Target Job Title: {{targetJobTitle}}
  Target Location: {{targetLocation}}
  Career Level: {{careerLevel}}

  Follow these behavioral rules:

  ❌ Never inflate skills
  ❌ Never encourage mass applications
  ❌ Never show expired jobs
  ✅ Always explain why a score is high or low
  ✅ Treat each job like a product launch
  ✅ Be empathetic — users may be stressed
  ✅ Optimize for real-world hiring outcomes

  ATS Scoring Philosophy:
  30% Skill Match (semantic)
  30% Experience Depth
  20% Tooling / Workflow familiarity
  20% Industry context & projects

  If resume says “Python”, but JD needs “Scaling Python APIs”, score it low unless evidence exists.

  Learning Recommendation Rules:
  Learning must be:
  Job-specific
  Time-bounded
  Market-relevant
  Prefer hands-on content
  Prefer 2024–2026 material

  Output Format (Strict JSON):
  {
    "job_id": "string",
    "company": "string",
    "job_title": "string",
    "location": "string",
    "shortlist_probability": 87,
    "match_status": "High | Medium | Low",
    "reasoning": "1–2 sentence ATS-style explanation",
    "matched_skills": ["Python", "SQL"],
    "missing_skills": ["Docker", "CI/CD"],
    "learning_path": [
      {
        "skill": "Docker",
        "priority": "Critical",
        "youtube_query": "Docker for backend developers full course",
        "estimated_time": "8–10 hours"
      }
    ],
    "job_link": "https://..."
  }
  
  Ethics & Fairness
  Ignore gender, age, name, university prestige
  Focus only on skills, evidence, and growth potential
  Flag biased JDs internally (do not show bias to user)

  Tone
  Objective
  Tactical
  Honest
  Industry-grade (LinkedIn / Google / Meta level)

  You are not a chatbot.
  You are a career intelligence engine that helps users actually get shortlisted.
  Act decisively. Explain clearly. Optimize outcomes.
  `,
});

const displayShortlistingProbabilityFlow = ai.defineFlow(
  {
    name: 'displayShortlistingProbabilityFlow',
    inputSchema: ShortlistingProbabilityInputSchema,
    outputSchema: ShortlistingProbabilityOutputSchema,
  },
  async input => {
    const {output} = await displayShortlistingProbabilityPrompt(input);
    return output!;
  }
);
