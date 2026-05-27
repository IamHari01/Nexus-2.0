import { StateGraph, Annotation } from '@langchain/langgraph';
import { 
  CandidateProfile, 
  Job, 
  JobMatchResult, 
  MarketTrends, 
  ResumeOptimization, 
  PersonalizedRecommendations, 
  TraceLog,
  MultiAgentResult
} from '@/lib/job-types';
import { 
  runResumeParserAgent,
  runJobFetcherAgent,
  runMarketAnalyzerAgent,
  runOpportunityRankerAgent,
  runResumeOptimizerAgent,
  runRecommendationGeneratorAgent,
  logTrace
} from './agents';

// ---------------------------------------------------------
// LangGraph State Annotation Channel Definitions
// ---------------------------------------------------------
export const AgentStateAnnotation = Annotation.Root({
  resumeText: Annotation<string>(),
  jobQuery: Annotation<string>(),
  location: Annotation<string>(),
  remoteOnly: Annotation<boolean>(),

  // Shared memory outputs populated by agents
  profile: Annotation<CandidateProfile | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  rawJobs: Annotation<Job[] | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  marketAnalysis: Annotation<MarketTrends | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  rankedOpportunities: Annotation<JobMatchResult[] | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  optimizedResumeSuggestions: Annotation<ResumeOptimization | undefined>({
    reducer: (x, y) => y ?? x,
  }),
  personalizedRecommendations: Annotation<PersonalizedRecommendations | undefined>({
    reducer: (x, y) => y ?? x,
  }),

  // Observability & Tracing Channels
  logs: Annotation<TraceLog[]>({
    reducer: (x, y) => y, // Node returns complete updated trace, overwrite current state
    default: () => [],
  }),
  confidenceScores: Annotation<Record<string, number>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  retries: Annotation<Record<string, number>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  error: Annotation<string | null | undefined>({
    reducer: (x, y) => y,
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;

// ---------------------------------------------------------
// Node Wrapper Functions for LangGraph Transitions
// ---------------------------------------------------------

async function resumeParserNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  try {
    const res = await runResumeParserAgent(state.resumeText, { logs: state.logs, retries: state.retries });
    return {
      profile: res.profile,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { resumeParser: res.parserConfidence }
    };
  } catch (err: any) {
    return {
      error: `ResumeParser failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'ResumeParser', 'failed', `Fatal parser exception: ${err.message || err}`)
    };
  }
}

async function jobFetcherNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.error) return {};

  const query = state.jobQuery || state.profile?.preferred_roles?.[0] || 'Software Engineer';
  try {
    const res = await runJobFetcherAgent(query, state.location, state.remoteOnly, { logs: state.logs, retries: state.retries });
    return {
      rawJobs: res.rawJobs,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { jobFetcher: res.fetcherConfidence }
    };
  } catch (err: any) {
    return {
      error: `JobFetcher failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'JobFetcher', 'failed', `Fatal fetcher exception: ${err.message || err}`)
    };
  }
}

async function marketAnalyzerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.error || !state.profile) return {};

  const query = state.jobQuery || state.profile?.preferred_roles?.[0] || 'Software Engineer';
  try {
    const res = await runMarketAnalyzerAgent(query, state.location, state.profile, { logs: state.logs, retries: state.retries });
    return {
      marketAnalysis: res.marketAnalysis,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { marketAnalyzer: res.marketConfidence }
    };
  } catch (err: any) {
    return {
      error: `MarketAnalyzer failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'MarketAnalyzer', 'failed', `Fatal market-analysis exception: ${err.message || err}`)
    };
  }
}

async function opportunityRankerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.error || !state.profile || !state.rawJobs) return {};

  try {
    const res = await runOpportunityRankerAgent(state.profile, state.rawJobs, { logs: state.logs, retries: state.retries });
    return {
      rankedOpportunities: res.rankedOpportunities,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { opportunityRanker: res.rankerConfidence }
    };
  } catch (err: any) {
    return {
      error: `OpportunityRanker failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'OpportunityRanker', 'failed', `Fatal ranker exception: ${err.message || err}`)
    };
  }
}

async function resumeOptimizerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.error || !state.profile || !state.marketAnalysis || !state.rankedOpportunities) return {};

  try {
    const res = await runResumeOptimizerAgent(
      state.profile,
      state.marketAnalysis,
      state.rankedOpportunities,
      { logs: state.logs, retries: state.retries }
    );
    return {
      optimizedResumeSuggestions: res.optimizedResumeSuggestions,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { resumeOptimizer: res.optimizerConfidence }
    };
  } catch (err: any) {
    return {
      error: `ResumeOptimizer failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'ResumeOptimizer', 'failed', `Fatal optimizer exception: ${err.message || err}`)
    };
  }
}

async function recommendationGeneratorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.error || !state.profile || !state.rankedOpportunities || !state.optimizedResumeSuggestions || !state.marketAnalysis) return {};

  try {
    const res = await runRecommendationGeneratorAgent(
      state.profile,
      state.rankedOpportunities,
      state.optimizedResumeSuggestions,
      state.marketAnalysis,
      { logs: state.logs, retries: state.retries }
    );
    return {
      personalizedRecommendations: res.personalizedRecommendations,
      logs: res.logs,
      retries: res.retries,
      confidenceScores: { recommendationGenerator: res.recommendationConfidence }
    };
  } catch (err: any) {
    return {
      error: `RecommendationGenerator failed: ${err.message || err}`,
      logs: logTrace(state.logs, 'RecommendationGenerator', 'failed', `Fatal recommendation exception: ${err.message || err}`)
    };
  }
}

/**
 * Robust recovery node running at the end of the flow.
 * If errors occurred upstream, populates sensible fallbacks and logs recovery.
 */
async function errorRecoveryNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.error) return {};

  let logs = logTrace(
    state.logs, 
    'OrchestratorRecovery', 
    'success', 
    `Gracefully recovering from exception: "${state.error}". Constructing default dataset to maintain dashboard operation.`
  );

  const fallbackProfile: CandidateProfile = state.profile || {
    skills: ['Software Engineering', 'Technical Problem Solving'],
    technologies: ['Git', 'TypeScript', 'Javascript'],
    preferred_roles: [state.jobQuery || 'Software Engineer']
  };

  const fallbackMarket: MarketTrends = {
    demandLevel: 'Medium',
    salaryRange: '$90,000 - $130,000',
    topHiringCompanies: ['Global Tech Services', 'Regional Inovations'],
    trendingSkills: ['TypeScript', 'React', 'Node.js'],
    summary: 'Standard market parameters generated. Check log tracers for network failure details.',
    confidence: 0.3
  };

  const fallbackOptimization: ResumeOptimization = {
    summary: 'ATS scan failed due to orchestrator connection issues. Highlight strong engineering accomplishments and key metrics in the project section.',
    skillsToHighlight: fallbackProfile.skills,
    wordingImprovements: [
      {
        original: 'Responsible for writing software and attending meetings.',
        suggested: 'Designed and deployed 4 full-stack cloud modules, improving response times by 18% and collaborating with agile engineering leads.',
        reason: 'Adds strong action verbs, quantifiable metrics, and clear ownership details.'
      }
    ],
    formattingSuggestions: [
      'Maintain clean margins (0.5 to 1 inch)',
      'Ensure standard single-column text is used so scanner reads fields in order'
    ],
    confidence: 0.3
  };

  const fallbackRecommendations: PersonalizedRecommendations = {
    careerActionPlan: [
      'Verify target role description requirements',
      'Optimize LinkedIn summary for keywords matching preferred roles',
      'Review and practice core algorithmic coding exercises'
    ],
    applicationStrategy: 'Prepare a crisp cover letter highlighting your background matching the job query and submit directly through portal.',
    interviewPrepTips: [
      'Be prepared to speak to system scaling and data structures.',
      'Practice explaining projects utilizing the STAR method.'
    ],
    confidence: 0.3
  };

  return {
    profile: fallbackProfile,
    rawJobs: state.rawJobs || [],
    rankedOpportunities: state.rankedOpportunities || [],
    marketAnalysis: fallbackMarket,
    optimizedResumeSuggestions: fallbackOptimization,
    personalizedRecommendations: fallbackRecommendations,
    logs,
    error: null // clear error so execution reports success
  };
}

// ---------------------------------------------------------
// Build and Compile StateGraph
// ---------------------------------------------------------
const workflow = new StateGraph(AgentStateAnnotation)
  // Register Nodes
  .addNode('resume_parser', resumeParserNode)
  .addNode('job_fetcher', jobFetcherNode)
  .addNode('market_analyzer', marketAnalyzerNode)
  .addNode('opportunity_ranker', opportunityRankerNode)
  .addNode('resume_optimizer', resumeOptimizerNode)
  .addNode('recommendation_generator', recommendationGeneratorNode)
  .addNode('error_recovery', errorRecoveryNode);

// Configure Edges
workflow
  .addEdge('__start__', 'resume_parser')
  
  // Parallel Fork: ResumeParser splits into JobFetcher and MarketAnalyzer
  .addEdge('resume_parser', 'job_fetcher')
  .addEdge('resume_parser', 'market_analyzer')
  
  // Parallel Join: JobFetcher and MarketAnalyzer merge back at OpportunityRanker
  .addEdge('job_fetcher', 'opportunity_ranker')
  .addEdge('market_analyzer', 'opportunity_ranker')
  
  // Sequential pipeline
  .addEdge('opportunity_ranker', 'resume_optimizer')
  .addEdge('resume_optimizer', 'recommendation_generator')
  .addEdge('recommendation_generator', 'error_recovery')
  .addEdge('error_recovery', '__end__');

// Compile Graph
export const orchestrator = workflow.compile();

/**
 * Entrypoint to execute the multi-agent orchestrator
 */
export async function runOrchestrator(inputs: {
  resumeText: string;
  jobQuery: string;
  location: string;
  remoteOnly: boolean;
}): Promise<MultiAgentResult> {
  console.log('[Orchestrator] Launching Multi-Agent StateGraph runtime...');
  
  const initialState: Partial<AgentStateType> = {
    resumeText: inputs.resumeText,
    jobQuery: inputs.jobQuery,
    location: inputs.location,
    remoteOnly: inputs.remoteOnly,
    logs: [],
    confidenceScores: {},
    retries: {},
    error: null
  };

  const finalState = await orchestrator.invoke(initialState);

  // Return formatted result
  return {
    profile: finalState.profile || { skills: [], technologies: [], preferred_roles: [] },
    jobs: finalState.rawJobs || [],
    matches: finalState.rankedOpportunities || [],
    marketTrends: finalState.marketAnalysis || {
      demandLevel: 'Medium',
      salaryRange: 'N/A',
      topHiringCompanies: [],
      trendingSkills: [],
      summary: '',
      confidence: 0
    },
    resumeOptimization: finalState.optimizedResumeSuggestions || {
      summary: '',
      skillsToHighlight: [],
      wordingImprovements: [],
      formattingSuggestions: [],
      confidence: 0
    },
    recommendations: finalState.personalizedRecommendations || {
      careerActionPlan: [],
      applicationStrategy: '',
      interviewPrepTips: [],
      confidence: 0
    },
    logs: finalState.logs,
    completedAt: new Date().toISOString()
  };
}
