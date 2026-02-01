import { config } from 'dotenv';
config();

import '@/ai/flows/ats-resume-analysis.ts';
import '@/ai/flows/display-shortlisting-probability.ts';
import '@/ai/flows/identify-skill-gaps.ts';
import '@/ai/flows/generate-personalized-learning-path.ts';