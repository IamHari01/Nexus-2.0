'use client';

import type { AnalyzeResumeAgainstJobDescriptionOutput } from '@/ai/flows/ats-resume-analysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Briefcase,
  MapPin,
  Target,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowUpRight,
  BookOpen,
  Clock,
  Youtube
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


function ProbabilityScore({ score }: { score: number }) {
  const getScoreColorClasses = (s: number): { ring: string; text: string; bg: string; fill: string } => {
    if (s >= 85) return { ring: 'stroke-chart-2', text: 'text-chart-2', bg: 'bg-chart-2/10', fill: 'fill-chart-2' };
    if (s >= 60) return { ring: 'stroke-chart-4', text: 'text-chart-4', bg: 'bg-chart-4/10', fill: 'fill-chart-4' };
    return { ring: 'stroke-chart-1', text: 'text-chart-1', bg: 'bg-chart-1/10', fill: 'fill-chart-1' };
  };

  const colorClasses = getScoreColorClasses(score);
  const circumference = 2 * Math.PI * 56; // r=56
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative size-40">
      <svg className="size-full" viewBox="0 0 120 120">
        <circle
          className="stroke-muted"
          strokeWidth="8"
          fill="transparent"
          r="56"
          cx="60"
          cy="60"
        />
        <circle
          className={cn('transform -rotate-90 origin-center transition-all duration-1000 ease-out', colorClasses.ring)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r="56"
          cx="60"
          cy="60"
        />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center font-bold", colorClasses.text)}>
        <span className="text-4xl">{score}</span>
        <span className="text-lg">%</span>
      </div>
    </div>
  );
}

function MatchBadge({ status }: { status: 'High' | 'Medium' | 'Low' }) {
    const statusStyles = {
        High: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600/60',
        Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-600/60',
        Low: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-600/60',
    };
    return <Badge className={cn('text-sm', statusStyles[status])}>{status} Match</Badge>
}

export default function AnalysisResults({ result }: { result: AnalyzeResumeAgainstJobDescriptionOutput }) {
  
  const priorityStyles = {
    Critical: 'border-red-500/50 bg-red-500/5',
    High: 'border-orange-500/50 bg-orange-500/5',
    Medium: 'border-yellow-500/50 bg-yellow-500/5',
    Low: 'border-blue-500/50 bg-blue-500/5',
  }

  return (
    <TooltipProvider>
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30">
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{result.company}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-primary">{result.job_title}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{result.location}</span>
                </div>
            </div>
            <MatchBadge status={result.match_status} />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="text-lg font-medium text-muted-foreground">Shortlisting Probability</h3>
          <ProbabilityScore score={result.shortlist_probability} />
        </div>

        <div className="text-center bg-muted p-4 rounded-lg">
          <h4 className="font-semibold flex items-center justify-center gap-2"><Lightbulb className="h-5 w-5 text-accent"/>ATS Reasoning</h4>
          <p className="text-muted-foreground text-sm mt-1">{result.reasoning}</p>
        </div>

        <Separator />
        
        <div>
          <h4 className="font-semibold mb-4 text-lg">Skills Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h5 className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-green-500"/>Matched Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300">
                    {skill}
                  </Badge>
                ))}
                {result.matched_skills.length === 0 && <p className="text-sm text-muted-foreground">No skills matched.</p>}
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="flex items-center gap-2 font-medium"><XCircle className="h-5 w-5 text-red-500"/>Missing Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-red-500/50 text-red-700 dark:text-red-400">
                    {skill}
                  </Badge>
                ))}
                {result.missing_skills.length === 0 && <p className="text-sm text-muted-foreground">No skill gaps identified. Great fit!</p>}
              </div>
            </div>
          </div>
        </div>
        
        {result.learning_path && result.learning_path.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-4 text-lg">Personalized Learning Path</h4>
              <div className="space-y-4">
                {result.learning_path.map((item, index) => (
                  <Card key={index} className={cn('border-l-4', priorityStyles[item.priority])}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-primary">{item.skill}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Target className="h-3 w-3" />{item.priority} Priority</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.estimated_time}</span>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                                <Youtube className="h-5 w-5 text-red-600" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Search on YouTube</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-accent hover:bg-accent/90">
            <a href={result.job_link} target="_blank" rel="noopener noreferrer">
                Apply Now <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
        </Button>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}
