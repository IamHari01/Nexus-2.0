'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Briefcase, 
  FileText, 
  Loader2, 
  Target, 
  MapPin, 
  GraduationCap, 
  Sparkles, 
  FileUp, 
  X, 
  Clipboard,
  Search,
  Sparkle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  resumeText: z.string().min(1, 'Resume is required. You can upload a PDF or TXT file.'),
  jobDescription: z.string().min(100, 'Job description must be at least 100 characters.'),
  targetJobTitle: z.string().min(2, 'Job title is required.'),
  targetLocation: z.string().min(2, 'Location is required.'),
  careerLevel: z.string().optional(),
});

export type FormSchema = z.infer<typeof formSchema>;

interface AnalysisFormProps {
  onAnalyze: (data: FormSchema) => void;
  isLoading: boolean;
}

export default function AnalysisForm({ onAnalyze, isLoading }: AnalysisFormProps) {
  const getInitialValues = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_form_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            resumeText: parsed.resumeText || '',
            jobDescription: parsed.jobDescription || '',
            targetJobTitle: parsed.targetJobTitle || '',
            targetLocation: parsed.targetLocation || '',
            careerLevel: parsed.careerLevel || 'Junior',
          };
        } catch (e) {
          // ignore
        }
      }
    }
    return {
      resumeText: '',
      jobDescription: '',
      targetJobTitle: '',
      targetLocation: '',
      careerLevel: 'Junior',
    };
  };

  const [fileName, setFileName] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_form_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.fileName || null;
        } catch (e) {
          // ignore
        }
      }
    }
    return null;
  });

  const [isParsing, setIsParsing] = React.useState(false);
  const [clipboardSupported, setClipboardSupported] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (!navigator.clipboard || !navigator.clipboard.readText)) {
      setClipboardSupported(false);
    }
  }, []);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(),
  });

  const formValues = form.watch();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataToSave = {
        resumeText: formValues.resumeText || '',
        jobDescription: formValues.jobDescription || '',
        targetJobTitle: formValues.targetJobTitle || '',
        targetLocation: formValues.targetLocation || '',
        careerLevel: formValues.careerLevel || 'Junior',
        fileName: fileName,
      };
      localStorage.setItem('nexus_form_data', JSON.stringify(dataToSave));
    }
  }, [formValues, fileName]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    form.setValue('resumeText', '', { shouldValidate: false });
    setFileName(null);

    if (file.type === 'application/pdf') {
      try {
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
        
        if (!fullText.trim()) {
          throw new Error('Empty PDF content');
        }

        form.setValue('resumeText', fullText, { shouldValidate: true });
        setFileName(file.name);
        toast({
          title: 'Resume loaded',
          description: `Successfully extracted text from ${file.name}`,
        });
      } catch (error) {
        console.error('Error parsing PDF:', error);
        toast({
          variant: 'destructive',
          title: 'PDF Parsing Error',
          description: 'Could not extract text from the PDF. Try copying and pasting text instead.',
        });
      }
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      form.setValue('resumeText', text, { shouldValidate: true });
      setFileName(file.name);
      toast({
        title: 'Resume loaded',
        description: `Successfully read text from ${file.name}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Unsupported File Type',
        description: 'Please upload a PDF or TXT file.',
      });
    }

    setIsParsing(false);
    if (event.target) event.target.value = '';
  };
  
  const handleClearFile = () => {
    form.setValue('resumeText', '', { shouldValidate: true });
    setFileName(null);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md shadow-2xl relative overflow-hidden max-w-2xl mx-auto rounded-2xl">
      {/* Glow highlight mimicking Google styling */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
      <CardContent className="p-8">
        
        {/* Header mimicking Google AI style */}
        <div className="flex flex-col items-center justify-center text-center gap-2 mb-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkle className="h-3.5 w-3.5 animate-pulse" />
            Nexus AI Engine
          </div>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-1">Shortlisting Diagnostics</h3>
          <p className="text-sm text-slate-400 max-w-sm">Evaluate your match probability against any target job instantly.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAnalyze)} className="space-y-6">
            
            {/* Search-style Inputs */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="targetJobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Target className="h-3.5 w-3.5 text-blue-400" />Target Role
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input 
                          placeholder="e.g. Frontend Engineer" 
                          {...field} 
                          className="pl-9 bg-slate-950/40 border-slate-850 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm h-10 transition-all duration-300"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-red-400" />Location
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Remote / New York" 
                        {...field} 
                        className="bg-slate-950/40 border-slate-850 rounded-xl focus-visible:ring-red-500 focus-visible:border-red-500 text-sm h-10 transition-all duration-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Experience Level Selector */}
            <FormField
              control={form.control}
              name="careerLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <GraduationCap className="h-3.5 w-3.5 text-yellow-400" />Experience Level
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-950/40 border-slate-850 rounded-xl text-sm h-10">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-950 border-slate-850">
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid">Mid-level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resume Upload Box */}
            <FormField
              control={form.control}
              name="resumeText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />Resume Content
                  </FormLabel>
                  <FormControl>
                    <div>
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.txt"
                      />
                      {!fileName ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed border-slate-700 bg-slate-950/20 py-8 flex flex-col gap-2.5 h-auto hover:bg-slate-800/40 hover:border-slate-500 rounded-xl transition-all duration-300"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isParsing}
                        >
                          {isParsing ? (
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                          ) : (
                            <FileUp className="h-6 w-6 text-slate-400 transition-transform group-hover:-translate-y-0.5" />
                          )}
                          <div className="text-center">
                            <p className="font-semibold text-xs text-slate-300">{isParsing ? 'Processing text...' : 'Upload Resume'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">PDF or TXT supported</p>
                          </div>
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="truncate font-semibold text-slate-300">{fileName}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-rose-950/20 hover:text-rose-400"
                            onClick={handleClearFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Description Textarea */}
            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Briefcase className="h-3.5 w-3.5 text-violet-400" />Job Description
                    </FormLabel>
                    {clipboardSupported && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] uppercase font-bold text-violet-400 hover:bg-violet-950/20 flex items-center gap-1 rounded-lg"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              form.setValue('jobDescription', text, { shouldValidate: true });
                              toast({
                                title: 'Pasted successfully',
                                description: 'Job description loaded from clipboard.',
                              });
                            } else {
                              toast({
                                variant: 'destructive',
                                title: 'Clipboard is empty',
                                description: 'Copy the job description first, then paste.',
                              });
                            }
                          } catch (err) {
                            toast({
                              variant: 'destructive',
                              title: 'Clipboard Blocked',
                              description: 'Please grant permission or paste manually.',
                            });
                          }
                        }}
                      >
                        <Clipboard className="h-3.5 w-3.5" />
                        Paste
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the full JD requirements and responsibilities here..."
                      className="min-h-[160px] resize-y bg-slate-950/40 border-slate-850 rounded-xl focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm transition-all duration-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Glowing Action Button */}
            <Button 
              type="submit" 
              disabled={isLoading || isParsing} 
              className="w-full h-11 text-sm font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Generating ATS Report...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform text-white" />
                  Run AI Shortlist Diagnostics
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
