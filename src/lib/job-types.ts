export interface Job {
  id: string; // Unique generated hash or API ID
  job_title: string;
  company: string;
  location: string;
  description: string;
  job_link: string;
  source: 'JSearch' | 'Adzuna' | 'Remotive' | 'Manual';
  salary?: string;
  posted_at?: string;
  employment_type?: string; // Full-time, Part-time, Contract, Intern
  is_remote: boolean;
  company_logo?: string;
  publisher?: string;
  benefits?: string[];
  required_skills?: string[];
  raw_data?: any; // Original API payload for debugging
}

export interface CandidateProfile {
  name?: string;
  email?: string;
  skills: string[];
  technologies: string[];
  experience_years?: number;
  education?: Array<{
    degree: string;
    field_of_study?: string;
    institution?: string;
    graduation_year?: string;
  }>;
  certifications?: string[];
  preferred_roles: string[];
}

export interface JobMatchResult {
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  job_link: string;
  score: number; // 0-100 match percentage
  match_status: 'High' | 'Medium' | 'Low';
  reasoning: string;
  matched_skills: string[];
  missing_skills: string[];
  learning_path: Array<{
    skill: string;
    priority: string; // Critical, High, Medium, Low
    youtube_query: string;
    estimated_time: string;
  }>;
  matched_at: string; // ISO String
  company_logo?: string;
  salary?: string;
  employment_type?: string;
  publisher?: string;
  benefits?: string[];
  required_skills?: string[];
}

export interface DashboardStats {
  totalJobsFetched: number;
  averageMatchScore: number;
  highMatchesCount: number;
  topSkillsMatched: Array<{ skill: string; count: number }>;
  topMissingSkills: Array<{ skill: string; count: number }>;
}

export interface MarketTrends {
  demandLevel: 'High' | 'Medium' | 'Low';
  salaryRange: string;
  topHiringCompanies: string[];
  trendingSkills: string[];
  summary: string;
  confidence: number;
}

export interface WordingImprovement {
  original: string;
  suggested: string;
  reason: string;
}

export interface ResumeOptimization {
  summary: string;
  skillsToHighlight: string[];
  wordingImprovements: WordingImprovement[];
  formattingSuggestions: string[];
  confidence: number;
}

export interface PersonalizedRecommendations {
  careerActionPlan: string[];
  applicationStrategy: string;
  interviewPrepTips: string[];
  confidence: number;
}

export interface TraceLog {
  agentName: string;
  status: 'pending' | 'success' | 'retry' | 'failed';
  message: string;
  durationMs?: number;
  timestamp: string;
  confidence?: number;
}

export interface MultiAgentResult {
  profile: CandidateProfile;
  jobs: Job[];
  matches: JobMatchResult[];
  marketTrends: MarketTrends;
  resumeOptimization: ResumeOptimization;
  recommendations: PersonalizedRecommendations;
  logs: TraceLog[];
  completedAt: string;
}

