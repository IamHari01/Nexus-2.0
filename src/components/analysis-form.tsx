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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, FileText, Loader2, Target, MapPin, GraduationCap, Sparkles, FileUp, X } from 'lucide-react';
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
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeText: '',
      jobDescription: '',
      targetJobTitle: '',
      targetLocation: '',
      careerLevel: 'Junior',
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    form.setValue('resumeText', '', { shouldValidate: false });
    setFileName(null);

    if (file.type === 'application/pdf') {
      try {
        // Import explicitly from the build entry to avoid Turbopack chunk issues
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        
        // Use a reliable CDN for the worker that matches the pinned API version
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
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Analysis Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAnalyze)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="targetJobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Target className="h-3 w-3" />Target Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Frontend Engineer" {...field} className="border-border" />
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
                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><MapPin className="h-3 w-3" />Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Remote / New York" {...field} className="border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="careerLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><GraduationCap className="h-3 w-3" />Experience Level</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Select your career level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            <FormField
              control={form.control}
              name="resumeText"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><FileText className="h-3 w-3" />Resume Content</FormLabel>
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
                                    className="w-full border-border border-dashed py-10 flex-col gap-2 h-auto hover:bg-muted/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isParsing}
                                >
                                    {isParsing ? (
                                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    ) : (
                                      <FileUp className="h-6 w-6 text-muted-foreground" />
                                    )}
                                    <div className="text-center">
                                      <p className="font-semibold">{isParsing ? 'Engine Processing...' : 'Upload Resume'}</p>
                                      <p className="text-xs text-muted-foreground">PDF or TXT supported</p>
                                    </div>
                                </Button>
                            ) : (
                                <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText className="h-4 w-4 text-primary shrink-0" />
                                      <span className="truncate font-medium">{fileName}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
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

            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Briefcase className="h-3 w-3" />Job Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the full JD requirements and responsibilities here..."
                      className="min-h-[180px] resize-y border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading || isParsing} className="w-full h-12 text-lg font-bold">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                'Run AI Analysis'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
