'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  MapPin,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowUpRight,
  Clock,
  Youtube,
  MessageSquare,
  BarChart3,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/lib/types';

// Typewriter component for the AI reasoning stream effect
function TypewriterText({ text, speed = 10 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span className="text-slate-300 text-sm leading-relaxed">{displayedText}</span>;
}

// Google-style Radial Progress Dial
function ProbabilityScore({ score }: { score: number }) {
  const size = 130;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorClass = score >= 75 
    ? 'stroke-emerald-500' 
    : score >= 40 
      ? 'stroke-amber-500' 
      : 'stroke-rose-500';

  const textClass = score >= 75 
    ? 'text-emerald-400' 
    : score >= 40 
      ? 'text-amber-400' 
      : 'text-rose-400';

  return (
    <div className="relative flex items-center justify-center animate-in zoom-in duration-700" style={{ width: size, height: size }}>
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
          className={cn('transition-all duration-1000 ease-out', colorClass)}
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
      <div className={cn("absolute inset-0 flex flex-col items-center justify-center font-extrabold", textClass)}>
        <span className="text-3xl leading-none">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Match Rate</span>
      </div>
    </div>
  );
}

function MatchBadge({ status }: { status: 'High' | 'Medium' | 'Low' }) {
  const statusStyles = {
    High: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Low: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return <Badge className={cn('text-xs border px-2.5 py-0.5 rounded-full font-bold', statusStyles[status])}>{status} Match Fit</Badge>
}

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'skills' | 'roadmap' | 'jobs'>('diagnostic');
  const scrollRef = useRef<HTMLDivElement>(null);

  const priorityStyles: Record<string, string> = {
    Critical: 'border-rose-500/20 bg-rose-500/5 text-rose-400',
    High: 'border-primary/20 bg-primary/5 text-primary-foreground',
    Medium: 'border-slate-850 bg-slate-900/40 text-slate-300',
    Low: 'border-slate-850 bg-slate-900/20 text-slate-400',
  };

  return (
    <div ref={scrollRef} className="max-w-2xl mx-auto space-y-6 pt-4 pb-20 animate-in fade-in duration-500">
      
      {/* Header Diagnostic Card */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900/30 backdrop-blur-md shadow-2xl rounded-2xl relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
        <CardHeader className="p-6 border-b border-slate-800/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 max-w-[70%]">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{result.company}</span>
              </div>
              <CardTitle className="text-xl font-extrabold text-slate-100 line-clamp-1">{result.job_title}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{result.location}</span>
              </div>
            </div>
            <MatchBadge status={result.match_status} />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <ProbabilityScore score={result.shortlist_probability} />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              AI Diagnostics Report
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 min-h-[70px]">
              <TypewriterText text={result.reasoning} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google-inspired Material Tabs */}
      <div className="flex border-b border-slate-850 gap-2">
        <button
          onClick={() => setActiveTab('diagnostic')}
          className={cn(
            "px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 -mb-[2px]",
            activeTab === 'diagnostic' 
              ? "border-blue-500 text-blue-400" 
              : "border-transparent text-slate-400 hover:text-slate-350"
          )}
        >
          Diagnostic
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={cn(
            "px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 -mb-[2px]",
            activeTab === 'skills' 
              ? "border-red-500 text-red-400" 
              : "border-transparent text-slate-400 hover:text-slate-350"
          )}
        >
          Skills Intelligence
        </button>
        {result.learning_path && result.learning_path.length > 0 && (
          <button
            onClick={() => setActiveTab('roadmap')}
            className={cn(
              "px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 -mb-[2px]",
              activeTab === 'roadmap' 
                ? "border-yellow-500 text-yellow-400" 
                : "border-transparent text-slate-400 hover:text-slate-350"
            )}
          >
            Growth Road
          </button>
        )}
        <button
          onClick={() => setActiveTab('jobs')}
          className={cn(
            "px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 -mb-[2px]",
            activeTab === 'jobs' 
              ? "border-violet-500 text-violet-400" 
              : "border-transparent text-slate-400 hover:text-slate-350"
          )}
        >
          Market Opportunities
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-2 min-h-[300px]">
        {/* Diagnostic Panel */}
        {activeTab === 'diagnostic' && (
          <Card className="border-slate-850 bg-slate-900/10 p-6 space-y-5 rounded-2xl animate-in fade-in duration-300">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              ATS Evaluation Criteria
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-850/80 bg-slate-950/20 space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Skills Matching Score</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Semantic skill overlap</span>
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">High Focus</Badge>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-850/80 bg-slate-950/20 space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Experience Alignment</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Title depth & details</span>
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Balanced</Badge>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-850 bg-slate-950/30 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-yellow-500"/> Optimization Tip</p>
              To improve your shortlist probability, adjust your resume to explicitly reflect the missing technology items listed in the **Skills Intelligence** tab, matching the specific tooling requirements of the target description.
            </div>
          </Card>
        )}

        {/* Skills Intelligence Panel */}
        {activeTab === 'skills' && (
          <Card className="border-slate-850 bg-slate-900/10 p-6 space-y-6 rounded-2xl animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Matched Skills */}
              <div className="space-y-3">
                <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="h-4 w-4"/>Matched Skills ({result.matched_skills.length})
                </h5>
                {result.matched_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.matched_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-lg">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No matching skills identified.</p>
                )}
              </div>

              {/* Missing Skills */}
              <div className="space-y-3">
                <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                  <XCircle className="h-4 w-4"/>Missing Skills ({result.missing_skills.length})
                </h5>
                {result.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_skills.map((skill) => (
                      <Badge key={skill} variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs px-2.5 py-0.5 rounded-lg">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Congratulations! No critical missing skills found.</p>
                )}
              </div>

            </div>
          </Card>
        )}

        {/* Growth Road Panel */}
        {activeTab === 'roadmap' && result.learning_path && (
          <Card className="border-slate-850 bg-slate-900/10 p-6 space-y-4 rounded-2xl animate-in fade-in duration-300">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-yellow-400" />
              Personalized Learning Roadmap
            </h4>
            <div className="grid gap-3">
              {result.learning_path.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    'p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:translate-x-0.5',
                    priorityStyles[item.priority] || 'border-slate-850'
                  )}
                >
                  <div className="space-y-1.5">
                    <p className="font-bold text-sm text-foreground">{item.skill}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5 bg-slate-950/40 px-2 py-0.5 rounded-md border border-slate-850/80"><Clock className="h-3 w-3" />{item.estimated_time}</span>
                      <Badge variant="outline" className="bg-slate-950/40 border-slate-850/80 font-bold text-[9px] uppercase tracking-wider">{item.priority}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-rose-950/20 h-9 w-9 shrink-0" asChild>
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                      <Youtube className="h-5 w-5 text-rose-500" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Market Opportunities Panel */}
        {activeTab === 'jobs' && (
          <Card className="border-slate-850 bg-slate-900/10 p-6 space-y-6 rounded-2xl animate-in fade-in duration-300">
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">Related Job Openings</h4>
              {result.related_jobs && result.related_jobs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.related_jobs.map((job, index) => (
                    <Card key={index} className="flex flex-col justify-between border-slate-850 bg-slate-950/20 hover:border-violet-500/50 hover:bg-slate-900/30 transition-all duration-300 rounded-xl shadow-sm">
                      <CardHeader className="p-4 pb-2 space-y-1">
                        <CardTitle className="text-sm font-bold line-clamp-1">{job.job_title}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">{job.company} • {job.location}</CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-2">
                        <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold border-slate-850 h-8 hover:bg-slate-800/40">
                          <a href={job.job_link} target="_blank" rel="noopener noreferrer">
                            View Opportunity
                          </a>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No related openings identified at this time.</p>
              )}
            </div>
            
            <div className="pt-2 border-t border-slate-850/60">
              <Button asChild className="w-full h-11 text-xs font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500">
                <a href={result.job_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                  Final Application Step <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="text-center pt-4">
        <p className="text-[9px] font-bold tracking-[0.25em] text-slate-500 uppercase">Nexus Diagnostics Engine • Complete</p>
      </div>
    </div>
  );
}
