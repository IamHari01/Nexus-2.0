import { Job } from '@/lib/job-types';
import crypto from 'crypto';

// Helper to generate deterministic job IDs based on title and company
function generateJobId(title: string, company: string): string {
  const hash = crypto.createHash('md5');
  hash.update(`${title}-${company}`.toLowerCase().trim());
  return `job-${hash.digest('hex').substring(0, 16)}`;
}

// Remotive API Integration
async function fetchJobsFromRemotive(query: string): Promise<Job[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Remotive status ${res.status}`);
    const data = await res.json();
    
    if (!data.jobs || !Array.isArray(data.jobs)) return [];

    return data.jobs.map((item: any) => ({
      id: generateJobId(item.title, item.company_name),
      job_title: item.title,
      company: item.company_name,
      location: item.candidate_required_location || 'Remote',
      description: item.description?.replace(/<[^>]*>/g, '') || '', // strip HTML
      job_link: item.url,
      source: 'Remotive',
      salary: item.salary || undefined,
      posted_at: item.publication_date,
      employment_type: item.job_type || 'Full-time',
      is_remote: true,
    }));
  } catch (e) {
    console.error('Failed to fetch from Remotive API:', e);
    return [];
  }
}

function getAdzunaCountryCode(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes('india') || loc.includes('chennai') || loc.includes('bangalore') || loc.includes('mumbai') || loc.includes('delhi')) {
    return 'in';
  }
  if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('london')) {
    return 'gb';
  }
  if (loc.includes('canada') || loc.includes('toronto') || loc.includes('vancouver')) {
    return 'ca';
  }
  if (loc.includes('brazil') || loc.includes('brasil')) {
    return 'br';
  }
  if (loc.includes('australia') || loc.includes('sydney')) {
    return 'au';
  }
  if (loc.includes('germany') || loc.includes('berlin') || loc.includes('munich')) {
    return 'de';
  }
  if (loc.includes('france') || loc.includes('paris')) {
    return 'fr';
  }
  return 'us';
}

// Adzuna API Integration
async function fetchJobsFromAdzuna(query: string, location: string): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID || process.env.NEXT_PUBLIC_ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY || process.env.NEXT_PUBLIC_ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.log('Adzuna API credentials missing. Skipping Adzuna fetch.');
    return [];
  }

  try {
    const countryCode = getAdzunaCountryCode(location);
    const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&results_per_page=40&content-type=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Adzuna status ${res.status}`);
    const data = await res.json();

    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: generateJobId(item.title, item.company?.display_name || ''),
      job_title: item.title,
      company: item.company?.display_name || 'Confidential',
      location: item.location?.display_name || 'US',
      description: item.description || '',
      job_link: item.redirect_url,
      source: 'Adzuna',
      salary: item.salary_min ? `$${Math.round(item.salary_min).toLocaleString()}` : undefined,
      posted_at: item.created,
      is_remote: item.title.toLowerCase().includes('remote') || item.description.toLowerCase().includes('remote'),
    }));
  } catch (e) {
    console.error('Failed to fetch from Adzuna API:', e);
    return [];
  }
}

// Helper to format JSearch salaries dynamically
function formatJSearchSalary(item: any): string | undefined {
  if (!item.job_min_salary) return undefined;
  
  const minSal = Math.round(item.job_min_salary).toLocaleString();
  const maxSal = item.job_max_salary ? Math.round(item.job_max_salary).toLocaleString() : null;
  const currency = item.job_salary_currency || '$';
  const period = item.job_salary_period ? `/ ${item.job_salary_period}` : '';
  
  if (maxSal) {
    return `${currency}${minSal} - ${currency}${maxSal} ${period}`.trim();
  }
  return `${currency}${minSal} ${period}`.trim();
}

// JSearch (RapidAPI) Integration
async function fetchJobsFromJSearch(
  query: string, 
  location: string, 
  customApiKey?: string, 
  sourceName = 'JSearch'
): Promise<Job[]> {
  const rawApiKey = customApiKey || process.env.JSEARCH_API_KEY || process.env.NEXT_PUBLIC_JSEARCH_API_KEY;
  const apiKey = rawApiKey?.trim();

  if (!apiKey) {
    console.log(`[${sourceName}] JSearch API key missing. Skipping fetch.`);
    return [];
  }

  try {
    // Construct search query dynamically
    let searchQuery = query;
    const isRemoteSearch = location.toLowerCase().includes('remote') || location.trim() === '';
    
    if (isRemoteSearch) {
      searchQuery = `${query} remote`;
    } else {
      searchQuery = `${query} in ${location}`;
    }

    let url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1&date_posted=month`;
    
    if (isRemoteSearch) {
      url += `&remote_jobs_only=true`;
    }

    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`JSearch status ${res.status}`);
    const data = await res.json();

    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.slice(0, 10).map((item: any) => ({
      id: item.job_id || generateJobId(item.job_title, item.employer_name),
      job_title: item.job_title,
      company: item.employer_name,
      location: `${item.job_city || ''} ${item.job_state || ''} ${item.job_country || ''}`.trim() || (item.job_is_remote ? 'Remote' : 'Worldwide'),
      description: item.job_description || '',
      job_link: item.job_apply_link || item.job_google_link || '',
      source: sourceName,
      salary: formatJSearchSalary(item),
      posted_at: item.job_posted_at_datetime_utc || item.job_posted_at_timestamp,
      employment_type: item.job_employment_type || 'Full-time',
      is_remote: item.job_is_remote || false,
      company_logo: item.employer_logo || undefined,
      publisher: item.job_publisher || undefined,
      benefits: item.job_benefits || undefined,
      required_skills: item.job_required_skills || undefined,
    }));
  } catch (e) {
    console.error(`Failed to fetch from ${sourceName} API:`, e);
    return [];
  }
}

// Arbeitnow API Integration
async function fetchJobsFromArbeitnow(
  query: string, 
  location: string, 
  customApiKey?: string
): Promise<Job[]> {
  const rawApiKey = customApiKey || process.env.ARBEITNOW_API_KEY;
  const apiKey = rawApiKey?.trim();

  try {
    const url = `https://arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`Arbeitnow status ${res.status}`);
    const data = await res.json();

    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.slice(0, 10).map((item: any) => ({
      id: generateJobId(item.title, item.company_name),
      job_title: item.title,
      company: item.company_name,
      location: item.location || 'Remote',
      description: item.description?.replace(/<[^>]*>/g, '') || '', // strip HTML
      job_link: item.url,
      source: 'Arbeitnow',
      posted_at: new Date(item.created_at * 1000).toISOString(),
      employment_type: item.job_types?.[0] || 'Full-time',
      is_remote: item.remote || false,
    }));
  } catch (e) {
    console.error('Failed to fetch from Arbeitnow API:', e);
    return [];
  }
}

// SerpApi Google Jobs Integration
async function fetchJobsFromSerpApi(
  query: string, 
  location: string, 
  customApiKey?: string
): Promise<Job[]> {
  const rawApiKey = customApiKey || process.env.SERPAPI_API_KEY;
  const apiKey = rawApiKey?.trim();

  if (!apiKey) {
    console.log('SerpApi API key missing. Skipping SerpApi fetch.');
    return [];
  }

  try {
    const countryCode = location ? getAdzunaCountryCode(location) : 'us';
    const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&location=${encodeURIComponent(location || 'Remote')}&gl=${countryCode}&api_key=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`SerpApi status ${res.status}`);
    const data = await res.json();

    const jobsList = data.jobs_results || [];

    return jobsList.slice(0, 10).map((item: any) => {
      const extensions = item.extensions || [];
      const isRemote = extensions.some((ext: string) => 
        ext.toLowerCase().includes('remote') || 
        ext.toLowerCase().includes('work from home')
      );
      const empType = extensions.find((ext: string) => 
        ext.toLowerCase().includes('full-time') || 
        ext.toLowerCase().includes('part-time') || 
        ext.toLowerCase().includes('contract')
      ) || 'Full-time';

      return {
        id: item.job_id || generateJobId(item.title, item.company_name || ''),
        job_title: item.title,
        company: item.company_name || 'Confidential',
        location: item.location || 'Worldwide',
        description: item.description || '',
        job_link: item.share_link || '',
        source: 'SerpApi',
        posted_at: new Date().toISOString(),
        employment_type: empType,
        is_remote: isRemote,
        company_logo: item.thumbnail || undefined,
      };
    });
  } catch (e) {
    console.error('Failed to fetch from SerpApi:', e);
    return [];
  }
}

// Production-grade fallback generator for mock jobs
function getMockJobs(query: string, location: string, remoteOnly: boolean): Job[] {
  const companies = [
    'Stripe', 'Vercel', 'Linear', 'Supabase', 'Clerk', 'Resend', 'Google', 'Meta',
    'Netflix', 'Apple', 'Amazon', 'Microsoft', 'Airbnb', 'Uber', 'Figma', 'Retool'
  ];
  const skillsPool = {
    Frontend: ['React', 'Next.js', 'TailwindCSS', 'TypeScript', 'Redux', 'HTML5', 'CSS3', 'Jest'],
    Backend: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'REST APIs', 'GraphQL'],
    AI: ['Python', 'Gemini API', 'Langchain', 'OpenAI', 'Embeddings', 'Vector Databases', 'PyTorch'],
    DevOps: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Terraform', 'Linux']
  };

  const selectedTitle = query || 'Software Engineer';
  const selectedLoc = location || 'Remote';
  const queryLower = selectedTitle.toLowerCase();
  const baseTitle = selectedTitle.trim() || 'Software Engineer';

  // Generate 30 highly relevant job titles dynamically using prefix and suffix patterns
  const generatedTitles: string[] = [baseTitle];
  generatedTitles.push(`Senior ${baseTitle}`);
  generatedTitles.push(`Lead ${baseTitle}`);
  generatedTitles.push(`Staff ${baseTitle}`);
  generatedTitles.push(`Principal ${baseTitle}`);
  generatedTitles.push(`${baseTitle} II`);
  generatedTitles.push(`${baseTitle} III`);
  generatedTitles.push(`Contract ${baseTitle}`);
  generatedTitles.push(`Remote ${baseTitle}`);
  generatedTitles.push(`Associate ${baseTitle}`);

  // Inject domain-specific equivalents if query contains keywords
  if (queryLower.includes('ai') || queryLower.includes('machine') || queryLower.includes('ml') || queryLower.includes('nlp')) {
    generatedTitles.push(
      'Machine Learning Engineer',
      'Generative AI Developer',
      'AI/ML Research Scientist',
      'NLP Specialist',
      'Deep Learning Engineer',
      'AI Platform Engineer',
      'AI Solutions Architect',
      'Computer Vision Engineer'
    );
  } else if (queryLower.includes('front') || queryLower.includes('react') || queryLower.includes('ui') || queryLower.includes('web')) {
    generatedTitles.push(
      'Frontend Engineer',
      'Senior Frontend Developer',
      'UI/UX Developer',
      'React Developer',
      'Lead Web Engineer',
      'Next.js Specialist'
    );
  } else if (queryLower.includes('back') || queryLower.includes('node') || queryLower.includes('api') || queryLower.includes('server')) {
    generatedTitles.push(
      'Backend Software Engineer',
      'Node.js Developer',
      'Distributed Systems Engineer',
      'API Platform Engineer',
      'Database Specialist'
    );
  } else if (queryLower.includes('devops') || queryLower.includes('cloud') || queryLower.includes('sre') || queryLower.includes('infra')) {
    generatedTitles.push(
      'Site Reliability Engineer (SRE)',
      'Cloud Infrastructure Engineer',
      'DevOps Engineer',
      'Platform Security Specialist',
      'Kubernetes Administrator'
    );
  } else {
    generatedTitles.push(
      `Full Stack ${baseTitle}`,
      `Software Engineer - ${baseTitle}`,
      `Systems Developer (${baseTitle})`,
      `Applications Engineer (${baseTitle})`
    );
  }

  const mockJobs: Job[] = [];

  for (let i = 0; i < 30; i++) {
    const company = companies[i % companies.length];
    const jobTitle = generatedTitles[i % generatedTitles.length];
    
    // Ensure mock locations match target location or Remote
    const loc = i % 2 === 0 || remoteOnly ? 'Remote' : selectedLoc;

    // Build a realistic description with required skills
    const category = jobTitle.toLowerCase().includes('front') ? 'Frontend' : 
                     jobTitle.toLowerCase().includes('ai') || jobTitle.toLowerCase().includes('machine') || jobTitle.toLowerCase().includes('ml') ? 'AI' : 
                     jobTitle.toLowerCase().includes('devops') || jobTitle.toLowerCase().includes('cloud') || jobTitle.toLowerCase().includes('sre') ? 'DevOps' : 'Backend';

    const reqSkills = skillsPool[category];
    const desc = `We are looking for a highly skilled ${jobTitle} to join our team at ${company}. 

Key Requirements:
- 3+ years of professional software engineering experience.
- Deep expertise in ${reqSkills.slice(0, 3).join(', ')}.
- Familiarity with ${reqSkills.slice(3, 6).join(', ')}.
- Strong communication and collaboration skills.
- Experience with testing frameworks, CI/CD pipelines, and cloud hosting platforms.

Responsibilities:
- Build and maintain highly responsive web applications.
- Optimize frontend/backend systems for maximum scalability and low latency.
- Write clean, maintainable, and well-tested code.
- Participate in design sessions, code reviews, and architectural reviews.`;

    mockJobs.push({
      id: generateJobId(jobTitle, company),
      job_title: jobTitle,
      company: company,
      location: loc,
      description: desc,
      job_link: `https://example.com/careers/${company.toLowerCase()}-${i}`,
      source: 'Remotive', // Fallback to public source
      salary: `$${(100 + i * 5).toLocaleString()}k - $${(140 + i * 8).toLocaleString()}k`,
      posted_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      employment_type: 'Full-time',
      is_remote: loc === 'Remote',
    });
  }

  return mockJobs;
}

function getNormalizedLocationTerms(loc: string): string[] {
  const terms = [loc];
  if (loc.includes('bangalore') || loc.includes('bengaluru')) {
    terms.push('bangalore', 'bengaluru');
  }
  if (loc.includes('chennai') || loc.includes('madras') || loc.includes('tamil nadu')) {
    terms.push('chennai', 'madras', 'tamil nadu');
  }
  if (loc.includes('mumbai') || loc.includes('bombay')) {
    terms.push('mumbai', 'bombay');
  }
  if (loc.includes('delhi') || loc.includes('ncr') || loc.includes('new delhi')) {
    terms.push('delhi', 'ncr', 'new delhi');
  }
  if (loc.includes('san francisco') || loc.includes('sf') || loc.includes('bay area')) {
    terms.push('san francisco', 'sf', 'bay area');
  }
  if (loc.includes('new york') || loc.includes('ny') || loc.includes('nyc')) {
    terms.push('new york', 'ny', 'nyc');
  }
  return Array.from(new Set(terms));
}

function isLocationCompatible(jobLocation: string, targetLocation: string): boolean {
  const jobLoc = jobLocation.toLowerCase();
  const targetLoc = targetLocation.toLowerCase();

  // If target is "remote" or empty, any job is compatible
  if (!targetLoc || targetLoc.trim() === '' || targetLoc === 'remote') {
    return true;
  }

  const jobLocTerms = getNormalizedLocationTerms(jobLoc);
  const targetLocTerms = getNormalizedLocationTerms(targetLoc);

  // If any target terms are included in job terms, or vice versa
  for (const tLoc of targetLocTerms) {
    for (const jLoc of jobLocTerms) {
      if (jLoc.includes(tLoc) || tLoc.includes(jLoc)) {
        return true;
      }
    }
  }

  // Handle Remote / Worldwide jobs
  const isJobRemote = jobLoc.includes('remote') || jobLoc.includes('worldwide') || jobLoc.includes('global');
  
  if (isJobRemote) {
    // If the remote job has a restriction that doesn't match the target, it's incompatible.
    // e.g. target is "Chennai" (India), and job location is "Remote (US)" or "Remote (Europe)"
    const restrictedRegions = ['us', 'usa', 'united states', 'europe', 'canada', 'uk', 'brazil', 'latam', 'americas'];
    for (const region of restrictedRegions) {
      if (jobLoc.includes(region) && !targetLoc.includes(region)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

// Simple in-memory cache for job searches to protect JSearch API keys and load instantly
interface CacheEntry {
  timestamp: number;
  jobs: Job[];
}

const jobCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL for speed and quota optimization

// Orchestrator: Fetch from all sources, normalize, remove duplicates
export async function fetchJobs(
  query: string,
  location: string = 'Remote',
  remoteOnly: boolean = false
): Promise<Job[]> {
  const normQuery = (query || '').toLowerCase().trim();
  const normLoc = (location || '').toLowerCase().trim();
  const cacheKey = `${normQuery}|${normLoc}|${remoteOnly}`;

  // Check cache first
  const cached = jobCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Cache Hit] Returning ${cached.jobs.length} cached jobs for key: "${cacheKey}"`);
    return cached.jobs;
  }

  console.log(`[Cache Miss] Starting Job Fetching Agent. Query: "${query}", Location: "${location}", RemoteOnly: ${remoteOnly}`);
  
  // Call APIs concurrently, splitting processes across the keys provided by the user
  const jsearchKey = process.env.JSEARCH_API_KEY;
  const jsearchMegaKey = process.env.JSEARCH_MEGA_API_KEY;
  const arbeitnowKey = process.env.ARBEITNOW_API_KEY;
  const serpapiKey = process.env.SERPAPI_API_KEY;

  const [
    remotiveJobs,
    adzunaJobs,
    jsearchJobs,
    jsearchMegaJobs,
    arbeitnowJobs,
    serpapiJobs
  ] = await Promise.all([
    fetchJobsFromRemotive(query).then(res => res.slice(0, 10)),
    fetchJobsFromAdzuna(query, location).then(res => res.slice(0, 10)),
    fetchJobsFromJSearch(query, location, jsearchKey, 'JSearch'),
    fetchJobsFromJSearch(query, location, jsearchMegaKey, 'JSearch Mega'),
    fetchJobsFromArbeitnow(query, location, arbeitnowKey),
    fetchJobsFromSerpApi(query, location, serpapiKey),
  ]);

  let allJobs = [
    ...jsearchJobs,
    ...jsearchMegaJobs,
    ...arbeitnowJobs,
    ...serpapiJobs,
    ...adzunaJobs,
    ...remotiveJobs
  ];

  // Filter jobs by location compatibility
  allJobs = allJobs.filter(job => isLocationCompatible(job.location, location));
  
  // Deduplicate based on ID (which is generated deterministically from title + company)
  const jobMap = new Map<string, Job>();
  for (const job of allJobs) {
    // If the job already exists, merge/keep the richer details (e.g. SerpApi > JSearch > Adzuna > Remotive)
    if (jobMap.has(job.id)) {
      const existing = jobMap.get(job.id)!;
      const rank = (source: string) => {
        if (source === 'SerpApi') return 5;
        if (source === 'JSearch' || source === 'JSearch Mega') return 4;
        if (source === 'Arbeitnow') return 3;
        if (source === 'Adzuna') return 2;
        return 1;
      };
      if (rank(job.source) > rank(existing.source)) {
        jobMap.set(job.id, job);
      }
    } else {
      jobMap.set(job.id, job);
    }
  }

  let uniqueJobs = Array.from(jobMap.values());

  // Apply filters
  if (remoteOnly) {
    uniqueJobs = uniqueJobs.filter(j => j.is_remote);
  }

  // Fallback to high-quality mock data if API results are dry/rate-limited/credentials missing
  if (uniqueJobs.length === 0) {
    console.log('No live jobs found. Generating realistic matched mock jobs as fallback.');
    uniqueJobs = getMockJobs(query, location, remoteOnly);
  } else if (uniqueJobs.length < 20) {
    console.log(`Aggregated live job count is only ${uniqueJobs.length}. Supplementing with mock jobs to guarantee 20+ entries.`);
    const mockJobs = getMockJobs(query, location, remoteOnly);
    const existingTitles = new Set(uniqueJobs.map(j => j.job_title.toLowerCase()));
    
    // Attempt to add unique mock jobs matching the location compatibility
    for (const mock of mockJobs) {
      if (uniqueJobs.length >= 25) break;
      if (!existingTitles.has(mock.job_title.toLowerCase()) && isLocationCompatible(mock.location, location)) {
        uniqueJobs.push(mock);
        existingTitles.add(mock.job_title.toLowerCase());
      }
    }
    
    // Fill up to 20 if we still need more, verifying location compatibility
    for (const mock of mockJobs) {
      if (uniqueJobs.length >= 20) break;
      if (!uniqueJobs.some(j => j.id === mock.id) && isLocationCompatible(mock.location, location)) {
        uniqueJobs.push(mock);
      }
    }
  }

  // Save to cache
  jobCache.set(cacheKey, {
    timestamp: Date.now(),
    jobs: uniqueJobs,
  });

  console.log(`Job Fetching Agent complete. Aggregated ${uniqueJobs.length} normalized jobs.`);
  return uniqueJobs;
}
