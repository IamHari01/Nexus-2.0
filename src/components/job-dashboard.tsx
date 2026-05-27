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
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAndMatchJobsAction } from '@/app/actions';
import type { Job, JobMatchResult, DashboardStats, MultiAgentResult } from '@/lib/job-types';

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
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Fetch Dashboard Stats & Match History
  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setMatches(data.matches);
        setLatestAnalysis(data.latestAnalysis || null);
        if (data.matches.length > 0 && !selectedMatch) {
          setSelectedMatch(data.matches[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error loading dashboard',
        description: 'Failed to retrieve stats. Please refresh.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  // Clear History Handler
  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your job matching history? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/jobs?action=clear');
      if (!res.ok) throw new Error('Clear failed');
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'History Cleared',
          description: 'All matching history and analytics have been reset.',
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
        title: 'Clear failed',
        description: 'Something went wrong while clearing history.',
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
        toast({ title: 'PDF Parsed Successfully', description: `${file.name} loaded into the engine.` });
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
        setFileName(file.name);
        toast({ title: 'Plaintext Loaded', description: `${file.name} loaded into the engine.` });
      } else {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload PDF or TXT.' });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Parsing Error', description: 'Could not extract text. Try pasting directly.' });
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
        toast({ title: 'Resume Pasted', description: 'Content successfully read from clipboard.' });
      } else {
        toast({ variant: 'destructive', title: 'Clipboard Empty', description: 'Please copy your resume text first.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Clipboard Blocked', description: 'Please grant clipboard permissions or paste manually.' });
    }
  };

  // Run Aggregate and Match Action
  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      toast({ variant: 'destructive', title: 'Resume Required', description: 'Please upload or paste your resume content.' });
      return;
    }

    setIsMatching(true);
    toast({ title: 'Launching Multi-Agent Orchestrator', description: 'Executing LangGraph StateGraph agents...' });

    try {
      const res = await fetchAndMatchJobsAction(
        resumeText,
        jobTitle,
        location,
        remoteOnly
      );

      if (res.success && res.result) {
        toast({
          title: 'Intelligence Analysis Complete!',
          description: `Successfully executed multi-agent workflow. Loaded live matches and market trends.`,
        });
        await loadDashboardData(); // Reload stats and results
        setActiveTab('matches'); // Switch to matches view
      } else {
        toast({
          variant: 'destructive',
          title: 'Matching Failed',
          description: res.error || 'Failed to execute orchestrator.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'System Error',
        description: err.message || 'An unexpected error occurred.',
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
        <div className="lg:col-span-4 space-y-6">
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
                    onClick={handleClearHistory}
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
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800/80 gap-2 pb-px overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 ${
                activeTab === 'matches'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Job Matches
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              disabled={!latestAnalysis}
              className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'market'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Market Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('optimizer')}
              disabled={!latestAnalysis}
              className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'optimizer'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Resume Optimizer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              disabled={!latestAnalysis}
              className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'recommendations'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Action Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trace')}
              disabled={!latestAnalysis}
              className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 px-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'trace'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-slate-200'
              }`}
            >
              Agent Trace
            </button>
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'matches' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-300">
              
              {/* Matches List (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Live Matching Feed</span>
                  {matches.length > 0 && <Badge className="bg-indigo-950 text-indigo-400 border-indigo-900">{matches.length} Results</Badge>}
                </h3>

                {isLoadingData ? (
                  <div className="flex h-64 flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-900/20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs text-muted-foreground">Synchronizing feed...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10 p-6 text-center gap-3">
                    <Briefcase className="h-8 w-8 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">No Job Matches Yet</p>
                      <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Upload your resume and search terms to scan live listings.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2 scrollbar-hide">
                    {matches.map((item) => {
                      const isSelected = selectedMatch?.job_id === item.job_id;
                      const scoreColor = item.score >= 75 ? 'text-emerald-400' : item.score >= 40 ? 'text-amber-400' : 'text-rose-400';
                      
                      return (
                        <div
                          key={item.job_id}
                          onClick={() => setSelectedMatch(item)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-2 ${
                            isSelected 
                              ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_12px_rgba(99,102,241,0.1)]' 
                              : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.company}</p>
                              <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.job_title}</h4>
                            </div>
                            <span className={`text-base font-extrabold shrink-0 ${scoreColor}`}>
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

              {/* Expanded Match Details (7 cols) */}
              <div className="md:col-span-7">
                {selectedMatch ? (
                  <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md h-full flex flex-col justify-between">
                    <div>
                      <CardHeader className="border-b border-slate-800/80 p-6 flex flex-row justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                            <Briefcase className="h-3.5 w-3.5" />
                            {selectedMatch.company}
                          </div>
                          <CardTitle className="text-xl font-bold text-foreground leading-tight">{selectedMatch.job_title}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{selectedMatch.location}</span>
                          </div>
                        </div>
                        {renderCircleScore(selectedMatch.score, 65, 5)}
                      </CardHeader>

                      <CardContent className="p-6 space-y-6 max-h-[420px] overflow-y-auto scrollbar-hide">
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
          )}

          {activeTab === 'market' && latestAnalysis && (
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
          )}

          {activeTab === 'optimizer' && latestAnalysis && (
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
          )}

          {activeTab === 'recommendations' && latestAnalysis && (
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
                        toast({ title: 'Template Copied', description: 'Outreach strategy text written to clipboard.' });
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
          )}

          {activeTab === 'trace' && latestAnalysis && (
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
                    {latestAnalysis.logs.map((log, idx) => {
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
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 border-slate-900 hover:border-slate-800 transition-all`}
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
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
