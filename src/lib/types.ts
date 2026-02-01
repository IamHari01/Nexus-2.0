import { type ShortlistingProbabilityOutput } from '@/ai/flows/display-shortlisting-probability';

export type RelatedJob = {
    job_title: string;
    company: string;
    location: string;
    job_link: string;
};

export type AnalysisResult = ShortlistingProbabilityOutput & {
  related_jobs: RelatedJob[];
};
