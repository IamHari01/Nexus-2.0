import JobDashboard from '@/components/job-dashboard';

export const metadata = {
  title: 'NEXUS - Job Intelligence Dashboard',
  description: 'AI-powered real-time job aggregation and resume matching system.',
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-3xl font-extrabold tracking-tight">Job Intelligence Dashboard</h2>
        <p className="text-slate-400 text-sm">Scan live job listings across Adzuna, Remotive, and JSearch, and map them to your resume profile using ATS match scoring agents.</p>
      </div>
      <JobDashboard />
    </div>
  );
}
