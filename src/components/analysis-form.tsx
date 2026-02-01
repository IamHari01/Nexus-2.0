'use client';

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
import { Briefcase, FileText, Loader2, Target, MapPin, GraduationCap, Sparkles, Upload, File, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import React, { useState } from 'react';

const formSchema = z.object({
  resumeText: z.string().min(100, 'Resume text must be at least 100 characters.'),
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

  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jobDescriptionFileName, setJobDescriptionFileName] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'resumeText' | 'jobDescription'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (fieldName === 'resumeText') {
        setResumeFileName(file.name);
      } else {
        setJobDescriptionFileName(file.name);
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        form.setValue(fieldName, text, { shouldValidate: true });
        toast({
          title: 'File Content Loaded',
          description: `Successfully loaded content from ${file.name}.`,
        });
      };
      reader.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'File Read Error',
          description: 'There was an error reading the file.',
        });
      };
      reader.readAsText(file, 'UTF-8');
    }
    // Reset file input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleClearFile = (fieldName: 'resumeText' | 'jobDescription') => {
    form.setValue(fieldName, '', { shouldValidate: true });
    if (fieldName === 'resumeText') {
      setResumeFileName(null);
    } else {
      setJobDescriptionFileName(null);
    }
  };


  return (
    <Card>
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
                      <Input placeholder="e.g., Software Engineer" {...field} />
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
                      <Input placeholder="e.g., San Francisco, CA" {...field} />
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
                      <SelectTrigger>
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
                   <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4" />Your Resume</FormLabel>
                    <Button variant="ghost" size="icon" asChild>
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        <span className="sr-only">Upload Resume</span>
                      </label>
                    </Button>
                    <Input
                      id="resume-upload"
                      type="file"
                      className="hidden"
                      accept=".txt,.md"
                      onChange={(e) => handleFileChange(e, 'resumeText')}
                    />
                  </div>
                  <FormControl>
                    {resumeFileName ? (
                      <div className="flex min-h-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{resumeFileName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleClearFile('resumeText')}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear file</span>
                        </Button>
                      </div>
                    ) : (
                    <Textarea
                      placeholder="Paste the full text of your resume here, or upload a file."
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                    )}
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
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Job Description</FormLabel>
                     <Button variant="ghost" size="icon" asChild>
                      <label htmlFor="jd-upload" className="cursor-pointer">
                        <Upload className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        <span className="sr-only">Upload Job Description</span>
                      </label>
                    </Button>
                    <Input
                      id="jd-upload"
                      type="file"
                      className="hidden"
                      accept=".txt,.md"
                      onChange={(e) => handleFileChange(e, 'jobDescription')}
                    />
                  </div>
                  <FormControl>
                  {jobDescriptionFileName ? (
                      <div className="flex min-h-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{jobDescriptionFileName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleClearFile('jobDescription')}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear file</span>
                        </Button>
                      </div>
                    ) : (
                    <Textarea
                      placeholder="Paste the full job description text here, or upload a file."
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
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
