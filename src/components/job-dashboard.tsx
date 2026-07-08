'use client';

import * as React from 'react';
import { 
  Briefcase, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  ArrowUpRight, 
  Clock, 
  Youtube, 
  Search, 
  Loader2, 
  Sparkles, 
  FileText, 
  FileUp, 
  X, 
  TrendingUp, 
  Award, 
  RefreshCw, 
  Clipboard,
  Trash2,
  SlidersHorizontal,
  Plus,
  Activity,
  Check,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAndMatchJobsAction } from '@/app/actions';
import type { Job, JobMatchResult, DashboardStats, MultiAgentResult } from '@/lib/job-types';
import { useDebounce } from '@/hooks/use-debounce';

export default function JobDashboard() {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form State
  const [resumeText, setResumeText] = React.useState('');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [jobTitle, setJobTitle] = React.useState('');
  const [location, setLocation] = React.useState('Remote');
  const [remoteOnly, setRemoteOnly] = React.useState(true);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isMatching, setIsMatching] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_form_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.resumeText) setResumeText(parsed.resumeText);
          if (parsed.fileName) setFileName(parsed.fileName);
          if (parsed.targetJobTitle) setJobTitle(parsed.targetJobTitle);
          if (parsed.targetLocation) setLocation(parsed.targetLocation);
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  // Sync state back to localStorage, only after mounting
  React.useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_form_data');
      let currentData: any = {};
      if (saved) {
        try {
          currentData = JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
      const dataToSave = {
        ...currentData,
        resumeText: resumeText || '',
        targetJobTitle: jobTitle || '',
        targetLocation: location || '',
        fileName: fileName,
      };
      localStorage.setItem('nexus_form_data', JSON.stringify(dataToSave));
    }
  }, [resumeText, jobTitle, location, fileName, isMounted]);

  // Data State
  const [stats, setStats] = React.useState<DashboardStats>({
    totalJobsFetched: 0,
    averageMatchScore: 0,
    highMatchesCount: 0,
    topSkillsMatched: [],
    topMissingSkills: [],
  });
  const [matches, setMatches] = React.useState<JobMatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = React.useState<JobMatchResult | null>(null);
  const [latestAnalysis, setLatestAnalysis] = React.useState<MultiAgentResult | null>(null);
  const [activeTab, setActiveTab] = React.useState<'matches' | 'market' | 'optimizer' | 'recommendations' | 'trace'>('matches');
  const [revealedSections, setRevealedSections] = React.useState<Record<string, boolean>>({ 'section-matches': true });
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Premium LinkedIn-like Filter States
  const [filterSearch, setFilterSearch] = React.useState('');
  const debouncedSearch = useDebounce(filterSearch, 250); // DSA: debounce to batch keystrokes
  const [filterMinScore, setFilterMinScore] = React.useState(35);
  const [filterStatuses, setFilterStatuses] = React.useState<string[]>(['High', 'Medium', 'Low']);
  const [filterModes, setFilterModes] = React.useState<string[]>(['Remote', 'On-site/Hybrid']);
  const [filterSources, setFilterSources] = React.useState<string[]>([]);
  const [filterCompanies, setFilterCompanies] = React.useState<string[]>([]);
  const [sortBy, setSortBy] = React.useState<'score' | 'title' | 'company'>('score');
  const [openFilterDropdown, setOpenFilterDropdown] = React.useState<string | null>(null);
  const filterBarRef = React.useRef<HTMLDivElement>(null);
  const [showAllCompanies, setShowAllCompanies] = React.useState(false);

  // Extract unique companies and sources for filtering
  const uniqueSources = React.useMemo(() => {
    const sources = matches.map(m => m.publisher || m.source || 'Unknown');
    return Array.from(new Set(sources)).filter(Boolean).sort();
  }, [matches]);

  const uniqueCompanies = React.useMemo(() => {
    const companies = matches.map(m => m.company);
    return Array.from(new Set(companies)).filter(Boolean).sort();
  }, [matches]);

  // Set default selected filters when matches change
  React.useEffect(() => {
    if (matches.length > 0) {
      setFilterSources(Array.from(new Set(matches.map(m => m.publisher || m.source || 'Unknown'))).filter(Boolean));
      setFilterCompanies(Array.from(new Set(matches.map(m => m.company))).filter(Boolean));
    } else {
      setFilterSources([]);
      setFilterCompanies([]);
    }
  }, [matches]);

  const handleResetFilters = () => {
    setFilterSearch('');
    setFilterMinScore(35);
    setFilterStatuses(['High', 'Medium', 'Low']);
    setFilterModes(['Remote', 'On-site/Hybrid']);
    setFilterSources(uniqueSources);
    setFilterCompanies(uniqueCompanies);
    setSortBy('score');
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // DSA-optimized filtering using Set for O(1) category lookups
  const filteredMatches = React.useMemo(() => {
    // Pre-compute Sets for O(1) lookups instead of O(K) array.includes()
    const statusSet = new Set(filterStatuses);
    const modeSet = new Set(filterModes);
    const sourceSet = new Set(filterSources);
    const companySet = new Set(filterCompanies);
    const searchTerm = debouncedSearch.toLowerCase().trim();

    // Single-pass O(N) filter
    const filtered = matches.filter((item) => {
      // Keyword search (debounced)
      if (searchTerm) {
        const inTitle = item.job_title.toLowerCase().includes(searchTerm);
        const inCompany = item.company.toLowerCase().includes(searchTerm);
        const inSkills = (item.matched_skills || []).some(sk => sk.toLowerCase().includes(searchTerm)) ||
                         (item.missing_skills || []).some(sk => sk.toLowerCase().includes(searchTerm));
        if (!inTitle && !inCompany && !inSkills) return false;
      }

      // O(1) numeric comparison
      if (item.score < filterMinScore) return false;

      // O(1) Set lookup
      if (!statusSet.has(item.match_status)) return false;

      // O(1) Set lookup for work mode
      const isRemote = item.location.toLowerCase().includes('remote');
      if (isRemote && !modeSet.has('Remote')) return false;
      if (!isRemote && !modeSet.has('On-site/Hybrid')) return false;

      // O(1) Set lookup for source
      const sourceName = item.publisher || item.source || 'Unknown';
      if (sourceSet.size > 0 && !sourceSet.has(sourceName)) return false;

      // O(1) Set lookup for company
      if (companySet.size > 0 && !companySet.has(item.company)) return false;

      return true;
    });

    // Sort only the filtered subset (cheaper than sorting full array)
    filtered.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'title') return a.job_title.localeCompare(b.job_title);
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      return 0;
    });

    return filtered;
  }, [matches, debouncedSearch, filterMinScore, filterStatuses, filterModes, filterSources, filterCompanies, sortBy]);

  // Reactive selected job selection based on filters
  React.useEffect(() => {
    if (filteredMatches.length > 0) {
      const isStillVisible = filteredMatches.some(m => m.job_id === selectedMatch?.job_id);
      if (!isStillVisible) {
        setSelectedMatch(filteredMatches[0]);
      }
    } else {
      setSelectedMatch(null);
    }
  }, [filteredMatches, selectedMatch]);

  // Fetch Dashboard Stats & Match History
  const loadDashboardData = async (forceSelectFirst?: boolean) => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setMatches(data.matches);
        setLatestAnalysis(data.latestAnalysis || null);
        if (data.matches.length > 0) {
          if (forceSelectFirst || !selectedMatch) {
            setSelectedMatch(data.matches[0]);
          }
        } else {
          setSelectedMatch(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to Load Stats',
        description: 'Could not fetch dashboard analytics. Please refresh to try again.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  // Intersection Observer for Scroll-Spy and Reveal Animations
  React.useEffect(() => {
    if (!isMounted) return;

    const sections = [
      'section-matches',
      'section-market',
      'section-optimizer',
      'section-recommendations',
      'section-trace'
    ];

    const observerOptions = {
      root: null,
      rootMargin: '-12% 0px -45% 0px',
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        
        // Handle Reveal Animation
        if (entry.isIntersecting) {
          setRevealedSections((prev) => ({ ...prev, [id]: true }));
        }

        // Handle Active Tab Highlight (Scroll-Spy)
        if (entry.isIntersecting) {
          let tabName: typeof activeTab = 'matches';
          if (id === 'section-matches') tabName = 'matches';
          else if (id === 'section-market') tabName = 'market';
          else if (id === 'section-optimizer') tabName = 'optimizer';
          else if (id === 'section-recommendations') tabName = 'recommendations';
          else if (id === 'section-trace') tabName = 'trace';
          
          setActiveTab(tabName);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [isMounted, latestAnalysis]);

  const handleTabClick = (tabName: typeof activeTab) => {
    let sectionId = 'section-matches';
    if (tabName === 'matches') sectionId = 'section-matches';
    else if (tabName === 'market') sectionId = 'section-market';
    else if (tabName === 'optimizer') sectionId = 'section-optimizer';
    else if (tabName === 'recommendations') sectionId = 'section-recommendations';
    else if (tabName === 'trace') sectionId = 'section-trace';

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveTab(tabName);
    }
  };

  // Clear History Handler
  const handleClearHistory = async () => {
    setShowResetModal(false);
    try {
      const res = await fetch('/api/jobs?action=clear');
      if (!res.ok) throw new Error('Clear failed');
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Match History Cleared',
          description: 'All records of past job match runs have been successfully cleared.',
        });
        setMatches([]);
        setSelectedMatch(null);
        setLatestAnalysis(null);
        setStats({
          totalJobsFetched: 0,
          averageMatchScore: 0,
          highMatchesCount: 0,
          topSkillsMatched: [],
          topMissingSkills: [],
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Clear History Failed',
        description: 'Failed to clear match history. Please try again.',
      });
    }
  };

  // PDF & Plaintext Resume File Upload Handler
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setResumeText('');
    setFileName(null);

    try {
      if (file.type === 'application/pdf') {
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        const PDFJS_VERSION = '4.10.38';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        
        if (!fullText.trim()) throw new Error('Empty PDF content');

        setResumeText(fullText);
        setFileName(file.name);
        toast({ title: 'PDF File Decoded', description: `${file.name} successfully uploaded.` });
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
        setFileName(file.name);
        toast({ title: 'Text File Loaded', description: `${file.name} successfully uploaded.` });
      } else {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a PDF (.pdf) or text (.txt) file.' });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not read file content. Please paste your resume text manually.' });
    } finally {
      setIsParsing(false);
      if (event.target) event.target.value = '';
    }
  };

  // Paste from Clipboard helper
  const handlePasteResume = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setResumeText(text);
        setFileName('Pasted Resume Text');
        toast({ title: 'Text Pasted', description: 'Resume text successfully pasted from clipboard.' });
      } else {
        toast({ variant: 'destructive', title: 'Clipboard Empty', description: 'Clipboard is empty. Please copy resume text and try again.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Clipboard Access Blocked', description: 'Please grant clipboard permissions or paste resume text manually.' });
    }
  };

  // Run Aggregate and Match Action
  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      toast({ variant: 'destructive', title: 'Missing Resume Text', description: 'Please enter or upload your resume text before starting the match.' });
      return;
    }

    setIsMatching(true);
    toast({ 
      title: 'Analyzing Job Matches...', 
      description: 'Running multi-agent match scoring to search and analyze job listings...' 
    });

    try {
      const res = await fetchAndMatchJobsAction(
        resumeText,
        jobTitle,
        location,
        remoteOnly
      );

      if (res.success && res.result) {
        toast({
          title: 'Matching Completed',
          description: `Matched job analysis is complete. Your matching jobs feed has been refreshed.`,
        });
        await loadDashboardData(true); // Reload stats and results
        setActiveTab('matches'); // Switch to matches view
      } else {
        toast({
          variant: 'destructive',
          title: 'Matching Failed',
          description: res.error || 'The matching request failed. Please try again.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Occurred',
        description: err.message || 'An unexpected error occurred during matching.',
      });
    } finally {
      setIsMatching(false);
    }
  };

  // Score circular SVG render
  const renderCircleScore = (score: number, size = 120, strokeWidth = 8) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const color = score >= 75 ? 'stroke-emerald-500' : score >= 40 ? 'stroke-amber-500' : 'stroke-rose-500';
    const textColor = score >= 75 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90 origin-center">
          <circle
            className="stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`transition-all duration-1000 ease-out ${color}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className={`absolute inset-0 flex flex-col items-center justify-center font-bold ${textColor}`}>
          <span className="text-2xl leading-none">{score}%</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">ATS Match</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Upper Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Briefcase className="h-20 w-20 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-indigo-400">Total Scanned Jobs</CardDescription>
            <CardTitle className="text-4xl font-extrabold text-foreground">{stats.totalJobsFetched}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-indigo-400" /> Live synchronized from public job feeds
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Award className="h-20 w-20 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-emerald-400">High Matches (75%+)</CardDescription>
            <CardTitle className="text-4xl font-extrabold text-foreground">{stats.highMatchesCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Ready for immediate optimized application
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="h-20 w-20 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-amber-400">Average Match Probability</CardDescription>
            <CardTitle className="text-4xl font-extrabold text-foreground">{stats.averageMatchScore}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="h-3 w-3 text-amber-400" /> Aim for 80%+ with resume optimization
          </CardContent>
        </Card>
      </div>

      {/* Main Form + Dashboard Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Aggregator Form (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-hide space-y-6">
          <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Aggregator Settings
              </CardTitle>
              <CardDescription>Setup your target criteria and resume profiles.</CardDescription>
            </CardHeader>
            <form onSubmit={handleRunMatch}>
              <CardContent className="space-y-5 pt-5">
                
                {/* Resume Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">1. Profile Resume</label>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleResumeUpload}
                    accept=".pdf,.txt"
                  />
                  {!fileName ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-20 border-dashed border-slate-700 flex flex-col gap-1 hover:bg-slate-800/50 hover:border-slate-600"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsing || isMatching}
                      >
                        {isParsing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        ) : (
                          <FileUp className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-semibold">Upload PDF</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-20 border-dashed border-slate-700 flex flex-col gap-1 hover:bg-slate-800/50 hover:border-slate-600"
                        onClick={handlePasteResume}
                        disabled={isParsing || isMatching}
                      >
                        <Clipboard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold">Paste Text</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="truncate font-semibold text-slate-300">{fileName}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-rose-950/30 hover:text-rose-400"
                        onClick={() => {
                          setResumeText('');
                          setFileName(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Job Search Fields */}
                <div className="space-y-4 pt-2 border-t border-slate-800/60">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">2. Search Criteria</label>
                  
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Target Role</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. Frontend Engineer"
                        className="pl-9 bg-slate-950/50 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Target Location</span>
                    <Input
                      placeholder="e.g. New York, Remote"
                      className="bg-slate-950/50 border-slate-800"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  {/* Remote / Hybrid Filters */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-slate-300">Remote Opportunities Only</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={remoteOnly}
                      onClick={() => setRemoteOnly(!remoteOnly)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        remoteOnly ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          remoteOnly ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="border-t border-slate-800/60 mt-4 pt-4 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  disabled={isMatching || isParsing || !resumeText.trim()} 
                  className="w-full h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                >
                  {isMatching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Matching Engines Active...
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Fetch & Match Jobs
                    </>
                  )}
                </Button>

                {matches.length > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/10 h-9"
                    onClick={() => setShowResetModal(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Reset Match Analytics
                  </Button>
                )}
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Multi-Agent Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Sticky Tab Sub-Navigation (Scroll-Spy Menu) */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md flex border-b border-slate-800/80 gap-2 pb-2 pt-4 overflow-x-auto scrollbar-hide -mx-2 px-2">
            <button
              type="button"
              onClick={() => handleTabClick('matches')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'matches'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Job Matches
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('market')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'market'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Market Trends
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('optimizer')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'optimizer'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Resume Optimizer
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('recommendations')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'recommendations'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Action Plan
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('trace')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'trace'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Agent Trace
            </button>
          </div>

          {/* Sequential Workspace Sections */}
          
          {/* SECTION 1: Job Matches */}
          <div 
            id="section-matches" 
            className={`scroll-mt-20 space-y-4 transition-all duration-700 ease-out ${
              revealedSections['section-matches'] 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Job Match Opportunities
            </h3>

            {/* ───── LinkedIn-Style Horizontal Floating Filter Bar ───── */}
            <div 
              ref={filterBarRef}
              className="sticky top-[3.5rem] z-20 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 shadow-lg shadow-slate-950/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    className="pl-8 h-8 text-xs bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                  {filterSearch && (
                    <button
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'sort' ? null : 'sort')}
                    className="h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Sort: {sortBy === 'score' ? 'Score' : sortBy === 'title' ? 'Title' : 'Company'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {openFilterDropdown === 'sort' && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-1 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-150">
                      {(['score', 'title', 'company'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSortBy(opt); setOpenFilterDropdown(null); }}
                          className={`w-full text-left px-3 py-1.5 text-[11px] rounded font-semibold capitalize transition-colors ${
                            sortBy === opt ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {opt === 'score' ? 'Score ↓' : opt === 'title' ? 'Title A-Z' : 'Company A-Z'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Min Score Pill */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'score' ? null : 'score')}
                    className="h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3"
                  >
                    Min: {filterMinScore}%
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {openFilterDropdown === 'score' && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-3 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-150">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min ATS Score</span>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="range" min={35} max={100} step={5}
                          value={filterMinScore}
                          onChange={(e) => setFilterMinScore(Number(e.target.value))}
                          className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-indigo-400 w-8 text-right">{filterMinScore}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fit Status Dropdown */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'fit' ? null : 'fit')}
                    className={`h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3 ${
                      filterStatuses.length < 3 ? 'border-indigo-500/50 text-indigo-400' : ''
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    Match Fit
                    {filterStatuses.length < 3 && <Badge className="h-4 px-1 text-[8px] bg-indigo-600 border-0">{filterStatuses.length}</Badge>}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {openFilterDropdown === 'fit' && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-2 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150">
                      {[
                        { label: 'High Fit (75%+)', value: 'High' },
                        { label: 'Medium Fit (40-74%)', value: 'Medium' },
                        { label: 'Low Fit (<40%)', value: 'Low' }
                      ].map((fit) => {
                        const checked = filterStatuses.includes(fit.value);
                        return (
                          <label key={fit.value} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800">
                            <input
                              type="checkbox" checked={checked}
                              onChange={() => checked
                                ? setFilterStatuses(filterStatuses.filter(s => s !== fit.value))
                                : setFilterStatuses([...filterStatuses, fit.value])
                              }
                              className="rounded border-slate-700 text-indigo-600 bg-slate-950 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                            />
                            <span className="select-none text-[11px] font-medium">{fit.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Work Mode Dropdown */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenFilterDropdown(openFilterDropdown === 'mode' ? null : 'mode')}
                    className={`h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3 ${
                      filterModes.length < 2 ? 'border-indigo-500/50 text-indigo-400' : ''
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    Work Mode
                    {filterModes.length < 2 && <Badge className="h-4 px-1 text-[8px] bg-indigo-600 border-0">{filterModes.length}</Badge>}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {openFilterDropdown === 'mode' && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-2 min-w-[150px] animate-in fade-in slide-in-from-top-2 duration-150">
                      {['Remote', 'On-site/Hybrid'].map((mode) => {
                        const checked = filterModes.includes(mode);
                        return (
                          <label key={mode} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800">
                            <input
                              type="checkbox" checked={checked}
                              onChange={() => checked
                                ? setFilterModes(filterModes.filter(m => m !== mode))
                                : setFilterModes([...filterModes, mode])
                              }
                              className="rounded border-slate-700 text-indigo-600 bg-slate-950 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                            />
                            <span className="select-none text-[11px] font-medium">{mode}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Source Dropdown (if sources available) */}
                {uniqueSources.length > 0 && (
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'source' ? null : 'source')}
                      className={`h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3 ${
                        filterSources.length < uniqueSources.length ? 'border-indigo-500/50 text-indigo-400' : ''
                      }`}
                    >
                      Sources
                      {filterSources.length < uniqueSources.length && <Badge className="h-4 px-1 text-[8px] bg-indigo-600 border-0">{filterSources.length}</Badge>}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    {openFilterDropdown === 'source' && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-2 min-w-[150px] max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                        {uniqueSources.map((source) => {
                          const checked = filterSources.includes(source);
                          return (
                            <label key={source} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800">
                              <input
                                type="checkbox" checked={checked}
                                onChange={() => checked
                                  ? setFilterSources(filterSources.filter(s => s !== source))
                                  : setFilterSources([...filterSources, source])
                                }
                                className="rounded border-slate-700 text-indigo-600 bg-slate-950 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                              />
                              <span className="select-none text-[11px] font-medium">{source}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Company Dropdown (if companies available) */}
                {uniqueCompanies.length > 0 && (
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'company' ? null : 'company')}
                      className={`h-8 text-[10px] font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-800 gap-1.5 px-3 ${
                        filterCompanies.length < uniqueCompanies.length ? 'border-indigo-500/50 text-indigo-400' : ''
                      }`}
                    >
                      <Briefcase className="h-3 w-3" />
                      Companies
                      {filterCompanies.length < uniqueCompanies.length && <Badge className="h-4 px-1 text-[8px] bg-indigo-600 border-0">{filterCompanies.length}</Badge>}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    {openFilterDropdown === 'company' && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-2 min-w-[180px] max-h-[240px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                        {uniqueCompanies.map((company) => {
                          const checked = filterCompanies.includes(company);
                          return (
                            <label key={company} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800">
                              <input
                                type="checkbox" checked={checked}
                                onChange={() => checked
                                  ? setFilterCompanies(filterCompanies.filter(c => c !== company))
                                  : setFilterCompanies([...filterCompanies, company])
                                }
                                className="rounded border-slate-700 text-indigo-600 bg-slate-950 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                              />
                              <span className="select-none text-[11px] font-medium truncate max-w-[140px]">{company}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer + Clear All + Result Count */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50"
                  >
                    Clear All
                  </Button>
                  {matches.length > 0 && (
                    <Badge className="bg-indigo-950 text-indigo-400 border-indigo-900 text-[10px]">
                      {filteredMatches.length === matches.length 
                        ? `${matches.length} Results` 
                        : `${filteredMatches.length} / ${matches.length}`}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* ───── END Filter Bar ───── */}
            
            {/* Expanded 2-Column Layout: Feed (5 cols) + Insights (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Matches Feed List — expanded to 5 cols */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Live Matching Feed</span>
                </h3>

                {isLoadingData ? (
                  <div className="flex h-64 flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-900/20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs text-muted-foreground">Synchronizing feed...</p>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10 p-6 text-center gap-3">
                    <Briefcase className="h-8 w-8 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">No Job Matches Found</p>
                      <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Try loosening your filter criteria or run a new diagnostic search.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                    {filteredMatches.map((item) => {
                      const isSelected = selectedMatch?.job_id === item.job_id;
                      const scoreColor = item.score >= 75 ? 'text-emerald-400' : item.score >= 40 ? 'text-amber-400' : 'text-rose-400';
                      
                      return (
                        <div
                          key={item.job_id}
                          onClick={() => setSelectedMatch(item)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-2.5 ${
                            isSelected 
                              ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_12px_rgba(99,102,241,0.1)]' 
                              : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2.5">
                            <div className="flex gap-2.5 items-start overflow-hidden min-w-0">
                              {item.company_logo ? (
                                <img 
                                  src={item.company_logo} 
                                  alt={item.company} 
                                  className="h-9 w-9 rounded-lg object-contain bg-slate-950 border border-slate-800/80 p-1 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                  <Briefcase className="h-4.5 w-4.5" />
                                </div>
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{item.company}</p>
                                <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.job_title}</h4>
                              </div>
                            </div>
                            <span className={`text-base font-extrabold shrink-0 mt-0.5 ${scoreColor}`}>
                              {item.score}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.location}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{item.match_status} Fit</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Expanded Match Details — expanded to 7 cols */}
              <div className="lg:col-span-7">
                {selectedMatch ? (
                  <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md h-full flex flex-col justify-between">
                    <div>
                      <CardHeader className="border-b border-slate-800/80 p-6 flex flex-row justify-between items-start gap-4">
                        <div className="flex gap-3.5 items-start overflow-hidden min-w-0">
                          {selectedMatch.company_logo ? (
                            <img 
                              src={selectedMatch.company_logo} 
                              alt={selectedMatch.company} 
                              className="h-12 w-12 rounded-xl object-contain bg-slate-950 border border-slate-800 p-1.5 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                              <Briefcase className="h-6 w-6" />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                              {selectedMatch.company}
                            </div>
                            <CardTitle className="text-xl font-bold text-foreground leading-tight">{selectedMatch.job_title}</CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{selectedMatch.location}</span>
                            </div>
                            <div className="pt-3">
                              <Button asChild size="sm" className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg transition-all duration-300">
                                <a href={selectedMatch.job_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                                  Apply via Source Listing <ArrowUpRight className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                        {renderCircleScore(selectedMatch.score, 65, 5)}
                      </CardHeader>

                      <CardContent className="p-6 space-y-5 max-h-[420px] overflow-y-auto scrollbar-hide">
                        {/* Job Details Meta Badges */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pb-4 border-b border-slate-800/40 text-xs">
                          {selectedMatch.salary && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Salary Package</span>
                              <p className="font-semibold text-emerald-400">{selectedMatch.salary}</p>
                            </div>
                          )}
                          {selectedMatch.employment_type && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Job Type</span>
                              <p className="font-semibold text-slate-300">{selectedMatch.employment_type}</p>
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Publisher</span>
                            <p className="font-semibold text-indigo-400">
                              {selectedMatch.publisher || (selectedMatch.job_link.includes('indeed') ? 'Indeed' : 
                               selectedMatch.job_link.includes('linkedin') ? 'LinkedIn' : 
                               selectedMatch.job_link.includes('ziprecruiter') ? 'ZipRecruiter' : 
                               selectedMatch.job_link.includes('glassdoor') ? 'Glassdoor' : 'JSearch Feed')}
                            </p>
                          </div>
                        </div>

                        {/* Key Benefits */}
                        {selectedMatch.benefits && selectedMatch.benefits.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Benefits & Perks</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedMatch.benefits.map((b, idx) => (
                                <Badge key={idx} variant="outline" className="bg-indigo-950/10 border-indigo-900/30 text-indigo-300 text-[10px] px-2 py-0.5">
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Engine Reasoning */}
                        <div className="relative bg-indigo-950/20 p-5 rounded-xl border border-indigo-900/40">
                          <Lightbulb className="absolute -top-2.5 -left-2.5 h-6.5 w-6.5 text-indigo-400 bg-slate-950 rounded-full p-1 border border-indigo-900/40" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-2 pl-2">AI Match Reasoning</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-2">{selectedMatch.reasoning}</p>
                        </div>

                        {/* Skills Intelligence Grid */}
                        <div className="grid grid-cols-1 gap-4 pt-2">
                          {selectedMatch.matched_skills && selectedMatch.matched_skills.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5"/> Matched Skills ({selectedMatch.matched_skills.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedMatch.matched_skills.map((skill) => (
                                  <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedMatch.missing_skills && selectedMatch.missing_skills.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800/40">
                              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                                <XCircle className="h-3.5 w-3.5"/> Skill Gaps ({selectedMatch.missing_skills.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedMatch.missing_skills.map((skill) => (
                                  <Badge key={skill} variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] px-2 py-0.5">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Learning Path */}
                        {selectedMatch.learning_path && selectedMatch.learning_path.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-slate-800/40">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">Personalized Growth Path</h5>
                            <div className="grid gap-2">
                              {selectedMatch.learning_path.map((item, idx) => (
                                <div key={idx} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <p className="font-bold text-xs text-foreground">{item.skill}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {item.estimated_time}</span>
                                      <span className="px-1.5 py-0.25 rounded bg-slate-800 text-slate-400 font-semibold">{item.priority}</span>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-950/20 text-rose-500 shrink-0" asChild>
                                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                                      <Youtube className="h-5 w-5 text-rose-500" />
                                    </a>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <CardFooter className="border-t border-slate-800/80 p-6 pt-4 bg-slate-900/50">
                      <Button asChild className="w-full h-11 text-xs font-bold bg-indigo-600 hover:bg-indigo-500">
                        <a href={selectedMatch.job_link} target="_blank" rel="noopener noreferrer">
                          Apply via Source Listing <ArrowUpRight className="ml-1.5 h-4 w-4" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-900/10 text-center p-8 gap-3 min-h-[350px]">
                    <Sparkles className="h-8 w-8 text-indigo-500/50" />
                    <p className="text-sm font-semibold text-slate-400">Match Insights Panel</p>
                    <p className="text-xs text-muted-foreground max-w-sm">Select a job from the matching feed to view deep compatibility reports, skill gaps, and learning pathways.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 2: Market Trends */}
          <div 
            id="section-market" 
            className={`scroll-mt-20 pt-8 border-t border-slate-900/60 space-y-4 transition-all duration-700 ease-out ${
              revealedSections['section-market'] 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Market Trends & Salary Guide
            </h3>

            {latestAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-slate-900/20 border-slate-800 backdrop-blur-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase tracking-wider font-semibold text-indigo-400">Target Salary Guide</CardDescription>
                      <CardTitle className="text-3xl font-extrabold text-indigo-300 mt-1">{latestAnalysis.marketTrends.salaryRange}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
                      <TrendingUp className="h-4.5 w-4.5 text-indigo-400" /> Typical annual range for regional market
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/20 border-slate-800 backdrop-blur-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Demand Intensity</CardDescription>
                      <CardTitle className="text-3xl font-extrabold text-emerald-400 mt-1">
                        <span className="flex items-center gap-2">
                          {latestAnalysis.marketTrends.demandLevel}
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" /> Hiring volume index is currently strong
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-400" />
                      Market Landscape Overview
                    </CardTitle>
                    <CardDescription>Synthesized intelligence of target hiring requirements.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-indigo-500 pl-4 bg-indigo-950/10 py-3 rounded-r-lg">
                      {latestAnalysis.marketTrends.summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-indigo-400" /> Top Hiring Companies
                        </h4>
                        <div className="flex flex-col gap-2">
                          {latestAnalysis.marketTrends.topHiringCompanies.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-emerald-400" /> In-Demand Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {latestAnalysis.marketTrends.trendingSkills.map((s, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-1">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/10 backdrop-blur-sm relative overflow-hidden border-dashed p-8 text-center flex flex-col items-center justify-center min-h-[260px] group hover:border-slate-700/50 transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-30" />
                <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner relative z-10 group-hover:scale-105 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all duration-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 max-w-sm relative z-10">
                  <h3 className="text-sm font-bold text-slate-200">Market Guide Placeholder</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyze your resume to unlock target market salary guidelines, demand intensity levels, top hiring companies, and trending keywords.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* SECTION 3: Resume Optimizer */}
          <div 
            id="section-optimizer" 
            className={`scroll-mt-20 pt-8 border-t border-slate-900/60 space-y-4 transition-all duration-700 ease-out ${
              revealedSections['section-optimizer'] 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Resume Optimizer & ATS Audit
            </h3>

            {latestAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Award className="h-5 w-5 text-indigo-400" />
                      ATS Performance Evaluation
                    </CardTitle>
                    <CardDescription>Custom recommendations to improve resume parsing compatibility.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                      {latestAnalysis.resumeOptimization.summary}
                    </p>

                    {latestAnalysis.resumeOptimization.skillsToHighlight.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Skills to Feature More Prominently</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {latestAnalysis.resumeOptimization.skillsToHighlight.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs px-2.5 py-1">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {latestAnalysis.resumeOptimization.wordingImprovements.length > 0 && (
                  <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <RefreshCw className="h-4.5 w-4.5 text-emerald-400" />
                        ATS Wording Refinement (Before & After)
                      </CardTitle>
                      <CardDescription>Replace generic phrasing with metrics-driven accomplishments.</CardDescription>
                    </CardHeader>
                    <div className="border-t border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/50 text-muted-foreground uppercase tracking-wider font-bold">
                            <th className="p-4 w-1/3">Weak / Generic Statement</th>
                            <th className="p-4 w-1/3">Metrics-Driven Rewrite</th>
                            <th className="p-4 w-1/3">Optimization Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latestAnalysis.resumeOptimization.wordingImprovements.map((imp, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/10 transition-colors">
                              <td className="p-4 text-rose-400 bg-rose-950/5 font-mono line-through leading-relaxed">{imp.original}</td>
                              <td className="p-4 text-emerald-400 bg-emerald-950/5 font-semibold leading-relaxed">{imp.suggested}</td>
                              <td className="p-4 text-slate-400 leading-relaxed">{imp.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {latestAnalysis.resumeOptimization.formattingSuggestions.length > 0 && (
                  <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-4.5 w-4.5 text-amber-400" />
                        Formatting & Layout Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {latestAnalysis.resumeOptimization.formattingSuggestions.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 p-2 bg-slate-950/20 rounded border border-slate-800/40">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/10 backdrop-blur-sm relative overflow-hidden border-dashed p-8 text-center flex flex-col items-center justify-center min-h-[260px] group hover:border-slate-700/50 transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-30" />
                <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner relative z-10 group-hover:scale-105 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all duration-300">
                  <Award className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 max-w-sm relative z-10">
                  <h3 className="text-sm font-bold text-slate-200">ATS Optimizer Placeholder</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyze your resume to reveal metrics-driven wording rewrites, core missing skills to emphasize, and layout formatting audits.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* SECTION 4: Action Plan */}
          <div 
            id="section-recommendations" 
            className={`scroll-mt-20 pt-8 border-t border-slate-900/60 space-y-4 transition-all duration-700 ease-out ${
              revealedSections['section-recommendations'] 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Chronological Career Action Plan
            </h3>

            {latestAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-400" />
                      Chronological Career Action Plan
                    </CardTitle>
                    <CardDescription>Step-by-step priority guide formulated by career strategy agents.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
                      {latestAnalysis.recommendations.careerActionPlan.map((step, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border border-slate-800 text-[10px] font-extrabold text-indigo-400 shadow-md">
                            0{idx + 1}
                          </span>
                          <p className="text-xs text-slate-300 font-semibold leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      Hiring Manager Outreach Strategy
                    </CardTitle>
                    <CardDescription>Copy-paste intro message hooks designed for LinkedIn / Email outreach.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-all">
                      {latestAnalysis.recommendations.applicationStrategy}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="text-[11px] h-8 border-slate-700 hover:bg-slate-800"
                        onClick={() => {
                          navigator.clipboard.writeText(latestAnalysis.recommendations.applicationStrategy);
                           toast({ title: 'Template Copied', description: 'The outreach template has been copied to your clipboard.' });
                        }}
                      >
                        <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                        Copy Outreach Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {latestAnalysis.recommendations.interviewPrepTips.length > 0 && (
                  <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Lightbulb className="h-4.5 w-4.5 text-amber-400" />
                        Interview Preparation Focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {latestAnalysis.recommendations.interviewPrepTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 p-3 bg-slate-950/20 rounded-lg border border-slate-800/40">
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] shrink-0">Tip 0{idx + 1}</Badge>
                            <span className="leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/10 backdrop-blur-sm relative overflow-hidden border-dashed p-8 text-center flex flex-col items-center justify-center min-h-[260px] group hover:border-slate-700/50 transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-30" />
                <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner relative z-10 group-hover:scale-105 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 max-w-sm relative z-10">
                  <h3 className="text-sm font-bold text-slate-200">Chronological Action Plan Placeholder</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyze your resume to unlock customized interview preparation guides, application checklists, and outreach communication templates.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* SECTION 5: Agent Trace */}
          <div 
            id="section-trace" 
            className={`scroll-mt-20 pt-8 border-t border-slate-900/60 space-y-4 transition-all duration-700 ease-out ${
              revealedSections['section-trace'] 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              LangGraph Multi-Agent Telemetry Trace
            </h3>

            {latestAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
                      LangGraph Multi-Agent Execution Trace
                    </CardTitle>
                    <CardDescription>Real-time telemetry and auditing of agent states, retries, and confidence scores.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      {(() => {
                        interface CustomTraceLog {
                          agentName: string;
                          status: 'pending' | 'success' | 'retry' | 'failed';
                          message: string;
                          timestamp: string;
                          confidence?: number;
                          durationMs?: number;
                        }
                        
                        const latestLogsMap = new Map<string, CustomTraceLog>();
                        for (const log of latestAnalysis.logs) {
                          const existing = latestLogsMap.get(log.agentName);
                          if (
                            !existing || 
                            log.status === 'success' || 
                            log.status === 'failed' || 
                            (existing.status !== 'success' && existing.status !== 'failed')
                          ) {
                            latestLogsMap.set(log.agentName, log as CustomTraceLog);
                          }
                        }

                        const orderedAgents = [
                          'ResumeParser',
                          'JobFetcher',
                          'MarketAnalyzer',
                          'OpportunityRanker',
                          'ResumeOptimizer',
                          'RecommendationGenerator',
                          'OrchestratorRecovery'
                        ];

                        const displayLogs = orderedAgents
                          .map(name => latestLogsMap.get(name))
                          .filter(Boolean) as CustomTraceLog[];

                        return displayLogs.map((log, idx) => {
                          const isSuccess = log.status === 'success';
                          const isFailed = log.status === 'failed';
                          const isRetry = log.status === 'retry';
                          
                          let statusColor = 'text-indigo-400 bg-indigo-950/30 border-indigo-900/50';
                          let StatusIcon = Loader2;
                          if (isSuccess) {
                            statusColor = 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
                            StatusIcon = CheckCircle2;
                          } else if (isFailed) {
                            statusColor = 'text-rose-400 bg-rose-950/30 border-rose-900/50';
                            StatusIcon = XCircle;
                          } else if (isRetry) {
                            statusColor = 'text-amber-400 bg-amber-950/30 border-amber-900/50';
                            StatusIcon = RefreshCw;
                          }

                          return (
                            <div 
                              key={idx} 
                              className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 border-slate-900 hover:border-slate-800 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${statusColor}`}>
                                  <StatusIcon className={`h-4.5 w-4.5 ${isRetry || log.status === 'pending' ? 'animate-spin' : ''}`} />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-xs text-foreground">{log.agentName} Agent</span>
                                    <span className={`text-[9px] uppercase px-1.5 py-0.25 rounded border font-bold ${statusColor}`}>
                                      {log.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{log.message}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 pl-11 md:pl-0 text-[10px] text-muted-foreground font-mono">
                                {log.durationMs !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" /> { (log.durationMs / 1000).toFixed(2) }s
                                  </span>
                                )}
                                {log.confidence !== undefined && log.confidence > 0 && (
                                  <span className="flex items-center gap-1 font-bold text-slate-300">
                                    <Award className="h-3.5 w-3.5" /> { Math.round(log.confidence * 100) }% conf
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-slate-800 bg-slate-900/10 backdrop-blur-sm relative overflow-hidden border-dashed p-8 text-center flex flex-col items-center justify-center min-h-[260px] group hover:border-slate-700/50 transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-30" />
                <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner relative z-10 group-hover:scale-105 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all duration-300">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 max-w-sm relative z-10">
                  <h3 className="text-sm font-bold text-slate-200">LangGraph Telemetry Placeholder</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyze your resume to inspect real-time log tracking, token usage, agent confidence rankings, and execution times.
                  </p>
                </div>
              </Card>
            )}
          </div>

        </div>

      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 bg-rose-500/10 border border-rose-500/25 rounded-lg">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">Clear Job Match History?</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Are you sure you want to clear your job match history? This will delete all saved job matches, matching stats, and recommendation analytics permanently.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowResetModal(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800/40 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleClearHistory}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30"
                >
                  Clear History
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
