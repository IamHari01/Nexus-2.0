import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CandidateProfile } from '@/lib/job-types';

const CandidateProfileSchema = z.object({
  name: z.string().optional().describe('Candidate name, if found'),
  email: z.string().optional().describe('Candidate email, if found'),
  skills: z.array(z.string()).describe('Core hard skills and soft skills'),
  technologies: z.array(z.string()).describe('Specific programming languages, tools, frameworks, and technologies'),
  experience_years: z.number().optional().describe('Total years of professional experience'),
  education: z.array(z.object({
    degree: z.string(),
    field_of_study: z.string().optional(),
    institution: z.string().optional(),
    graduation_year: z.string().optional()
  })).optional().describe('Educational qualifications'),
  certifications: z.array(z.string()).optional().describe('Professional certifications'),
  preferred_roles: z.array(z.string()).describe('List of target/preferred job roles based on experience and background')
});

const ResumeParserInputSchema = z.object({
  resumeText: z.string()
});

const resumeParserPrompt = ai.definePrompt({
  name: 'resumeParserPrompt',
  input: { schema: ResumeParserInputSchema },
  output: { schema: CandidateProfileSchema },
  prompt: `You are an elite Resume Parsing Agent. Your goal is to analyze the provided resume text and extract a highly structured profile.
  
  Resume Content:
  """
  {{resumeText}}
  """
  
  Instructions:
  1. Extract core hard and soft skills. Be thorough but avoid generic buzzwords.
  2. Extract all technologies mentioned (languages, libraries, tools, cloud services, IDEs, databases).
  3. Calculate/estimate total years of professional experience. Be conservative (do not double-count overlapping internships or academic experience).
  4. Parse education details, including degree, field of study, school, and graduation year.
  5. Identify any professional certifications (e.g., AWS, GCP, PMP, Scrum Master).
  6. Deduce the target or preferred job titles/roles (e.g., "Senior Frontend Engineer", "DevOps Specialist") based on their work history and skill set.
  
  Ensure the response fits the JSON schema perfectly.
  `
});

export const resumeParserFlow = ai.defineFlow(
  {
    name: 'resumeParserFlow',
    inputSchema: ResumeParserInputSchema,
    outputSchema: CandidateProfileSchema,
  },
  async input => {
    const { output } = await resumeParserPrompt(input);
    return output!;
  }
);

export async function parseResume(resumeText: string): Promise<CandidateProfile> {
  return resumeParserFlow({ resumeText });
}
