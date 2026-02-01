'use server';
/**
 * @fileOverview A flow for finding related job opportunities.
 *
 * - findRelatedJobs - A function that finds related jobs.
 * - FindRelatedJobsInput - The input type for the findRelatedJobs function.
 * - FindRelatedJobsOutput - The return type for the findRelatedJobs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindRelatedJobsInputSchema = z.object({
  targetJobTitle: z.string().describe('The target job title for the candidate.'),
  targetLocation: z.string().describe('The target location for the job.'),
});
export type FindRelatedJobsInput = z.infer<typeof FindRelatedJobsInputSchema>;

const RelatedJobSchema = z.object({
  job_title: z.string().describe('The title of the related job.'),
  company: z.string().describe('The company offering the related job.'),
  location: z.string().describe('The location of the related job.'),
  job_link: z.string().url().describe('URL to the related job listing.'),
});

const FindRelatedJobsOutputSchema = z.object({
  related_jobs: z
    .array(RelatedJobSchema)
    .describe(
      'A list of at least four related job opportunities based on the target job title and location. These should be realistic but can be fictional.'
    ),
});
export type FindRelatedJobsOutput = z.infer<typeof FindRelatedJobsOutputSchema>;

export async function findRelatedJobs(
  input: FindRelatedJobsInput
): Promise<FindRelatedJobsOutput> {
  return findRelatedJobsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findRelatedJobsPrompt',
  input: {schema: FindRelatedJobsInputSchema},
  output: {schema: FindRelatedJobsOutputSchema},
  prompt: `You are a Related Jobs Agent. Your task is to generate a list of at least four realistic (but can be fictional) job opportunities based on the provided target job title and location.

  Target Job Title: {{targetJobTitle}}
  Target Location: {{targetLocation}}

  Instructions:
  - Generate a list of at least four related jobs.
  - The jobs should be realistic for the given title and location.
  - Provide a job title, company, location, and a fictional application link for each job.
  - Ensure the output is a valid JSON object matching the schema.
  `,
});

const findRelatedJobsFlow = ai.defineFlow(
  {
    name: 'findRelatedJobsFlow',
    inputSchema: FindRelatedJobsInputSchema,
    outputSchema: FindRelatedJobsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
