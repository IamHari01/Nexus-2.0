'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export default function PageHeader() {
  const pathname = usePathname();
  
  let pageTitle = 'Resume Analyzer';
  if (pathname === '/dashboard') {
    pageTitle = 'Job Intelligence Dashboard';
  } else if (pathname?.startsWith('/api')) {
    pageTitle = 'API Endpoint';
  }

  return (
    <div className="flex items-center gap-2 select-none animate-in fade-in duration-300">
      <span className="text-xs font-black tracking-widest text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-900/30 uppercase">
        Nexus
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
      <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
        {pageTitle}
      </span>
    </div>
  );
}
