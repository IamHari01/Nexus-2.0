'use server';
/**
 * @fileOverview Identifies skill gaps between a candidate's resume and a target job description.
 *
 * - identifySkillGaps - A function that identifies skill gaps.
 * - IdentifySkillGapsInput - The input type for the identifySkillGaps function.
 * - IdentifySkillGapsOutput - The return type for the identifySkillGaps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifySkillGapsInputSchema = z.object({
  resume: z.string().describe('The candidate\'s resume as a string.'),
  jobDescription: z.string().describe('The target job description as a string.'),
  shortlistProbability: z.number().describe('The probability of the candidate being shortlisted (0-99).'),
});
export type IdentifySkillGapsInput = z.infer<typeof IdentifySkillGapsInputSchema>;

const IdentifySkillGapsOutputSchema = z.object({
  missingSkills: z.array(z.string()).describe('The list of missing skills categorized by type.'),
  reasoning: z.string().describe('Explanation of why the candidate was rejected.'),
  skillGapClassification: z.object({
    hardSkills: z.array(z.string()).describe('Missing hard skills.'),
    experienceGaps: z.array(z.string()).describe('Missing experience.'),
    toolingWorkflowGaps: z.array(z.string()).describe('Missing tooling/workflow skills.'),
  }).optional(),
});
export type IdentifySkillGapsOutput = z.infer<typeof IdentifySkillGapsOutputSchema>;

export async function identifySkillGaps(input: IdentifySkillGapsInput): Promise<IdentifySkillGapsOutput> {
  return identifySkillGapsFlow(input);
}

const identifySkillGapsPrompt = ai.definePrompt({
  name: 'identifySkillGapsPrompt',
  input: {schema: IdentifySkillGapsInputSchema},
  output: {schema: IdentifySkillGapsOutputSchema},
  prompt: `You are an expert career advisor, skilled at identifying skill gaps between a candidate's resume and a job description.

  Given the candidate's resume and the target job description, identify the specific skills the candidate is missing.
  Categorize the missing skills into hard skills, experience gaps, and tooling/workflow gaps.
  Explain why the candidate was rejected based on these skill gaps.

  Resume:
  {{resume}}

  Job Description:
  {{jobDescription}}

  Shortlisting Probability: {{shortlistProbability}}

  Output a JSON object with the following keys:
  - missingSkills: An array of strings representing the missing skills.
  - reasoning: A 1-2 sentence explanation of why the candidate was rejected based on ATS scoring.
  - skillGapClassification: An object with keys 'hardSkills', 'experienceGaps', and 'toolingWorkflowGaps', each containing an array of missing skills in that category. This field is optional.
  `,
});

const identifySkillGapsFlow = ai.defineFlow(
  {
    name: 'identifySkillGapsFlow',
    inputSchema: IdentifySkillGapsInputSchema,
    outputSchema: IdentifySkillGapsOutputSchema,
  },
  async input => {
    const {output} = await identifySkillGapsPrompt(input);
    return output!;
  }
);
