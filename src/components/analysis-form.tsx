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
        // Dynamically import PDF.js ONLY in the client-side event handler
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker source dynamically
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => (typeof item === 'object' && 'str' in item ? item.str : '')).join(' ') + '\n';
        }
        form.setValue('resumeText', fullText, { shouldValidate: true });
        setFileName(file.name);
      } catch (error) {
        console.error('Error parsing PDF:', error);
        toast({
          variant: 'destructive',
          title: 'PDF Parsing Error',
          description: 'Could not extract text from the PDF. Please ensure it is a valid and text-based PDF.',
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
    if(event.target){
        event.target.value = '';
    }
  };
  
  const handleClearFile = () => {
    form.setValue('resumeText', '', { shouldValidate: true });
    setFileName(null);
    if(fileInputRef.current){
        fileInputRef.current.value = '';
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>Analysis Input</span>
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
                    <FormLabel className="flex items-center gap-2"><Target className="h-4 w-4" />Target Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer" {...field} className="border-border" />
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
                    <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4" />Target Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., San Francisco, CA" {...field} className="border-border" />
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
                  <FormLabel className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Career Level</FormLabel>
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
                    <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4" />Your Resume</FormLabel>
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
                                    className="w-full border-border"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isParsing}
                                >
                                    {isParsing ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <FileUp className="mr-2 h-4 w-4" />
                                    )}
                                    {isParsing ? 'Parsing PDF...' : 'Upload Resume (PDF or TXT)'}
                                </Button>
                            ) : (
                                <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                                    <span className="truncate">{fileName}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
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
                    <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Job Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the full job description text here."
                      className="min-h-[150px] resize-y border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading || isParsing} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Run Analysis'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
