// src/ai/flows/generate-personalized-learning-path.ts
'use server';
/**
 * @fileOverview Generates a personalized learning path for a candidate based on their skill gaps for a specific job.
 *
 * - generatePersonalizedLearningPath - A function that generates a personalized learning path.
 * - GeneratePersonalizedLearningPathInput - The input type for the generatePersonalizedLearningPath function.
 * - GeneratePersonalizedLearningPathOutput - The return type for the generatePersonalizedLearningPath function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedLearningPathInputSchema = z.object({
  jobDescription: z.string().describe('The job description.'),
  missingSkills: z.array(z.string()).describe('The missing skills identified for the job.'),
});

export type GeneratePersonalizedLearningPathInput = z.infer<typeof GeneratePersonalizedLearningPathInputSchema>;

const LearningPathItemSchema = z.object({
  skill: z.string().describe('The skill to learn.'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).describe('The priority of learning the skill.'),
  youtubeQuery: z.string().describe('The YouTube search query for learning the skill.'),
  estimatedTime: z.string().describe('The estimated time to learn the skill (e.g., 8-10 hours).'),
});

const GeneratePersonalizedLearningPathOutputSchema = z.object({
  learningPath: z.array(LearningPathItemSchema).describe('The personalized learning path.'),
});

export type GeneratePersonalizedLearningPathOutput = z.infer<typeof GeneratePersonalizedLearningPathOutputSchema>;

export async function generatePersonalizedLearningPath(
  input: GeneratePersonalizedLearningPathInput
): Promise<GeneratePersonalizedLearningPathOutput> {
  return generatePersonalizedLearningPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedLearningPathPrompt',
  input: {schema: GeneratePersonalizedLearningPathInputSchema},
  output: {schema: GeneratePersonalizedLearningPathOutputSchema},
  prompt: `You are a career coach specializing in creating personalized learning paths for job seekers.

  Based on the job description and the candidate's missing skills, generate a learning path with specific resources.

  Job Description: {{{jobDescription}}}
  Missing Skills: {{#each missingSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Instructions:
  *   Prioritize skills that are critical for the job.
  *   Recommend YouTube channels, documentation, and mini-projects.
  *   Optimize learning for shortlisting, focusing on hands-on, recent (2024-2026) material.
  *   Estimate the time required for each skill.
  *   The youtubeQuery field should be optimized for searching for relevant content on Youtube, prefer "full course" queries.

  Output format:Strict JSON - Firebase Friendly
  {
    "learning_path": [
      {
        "skill": "string",
        "priority": "Critical | High | Medium | Low",
        "youtube_query": "string",
        "estimated_time": "string"
      }
    ]
  }
  `,
});

const generatePersonalizedLearningPathFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedLearningPathFlow',
    inputSchema: GeneratePersonalizedLearningPathInputSchema,
    outputSchema: GeneratePersonalizedLearningPathOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
