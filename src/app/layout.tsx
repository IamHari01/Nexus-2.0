import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { HistoryProvider } from '@/context/history-context';
import HistoryList from '@/components/history-list';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut } from 'lucide-react';
import Logo from '@/components/logo';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import SidebarNav from '@/components/sidebar-nav';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'NEXUS',
  description: 'Maximize your shortlisting probability with AI-driven resume analysis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable)} suppressHydrationWarning>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <HistoryProvider>
              <SidebarProvider defaultOpen={true}>
                <Sidebar collapsible="icon" className="border-r border-slate-900/60 bg-slate-950/40 backdrop-blur-md">
                  <SidebarHeader>
                    <Logo />
                    <SidebarTrigger />
                  </SidebarHeader>
                  <SidebarContent>
                    <SidebarNav />
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-data-[collapsible=icon]:hidden mt-4">
                      Analysis History
                    </div>
                    <Suspense fallback={
                      <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse group-data-[collapsible=icon]:hidden">
                        Loading history...
                      </div>
                    }>
                      <HistoryList />
                    </Suspense>
                  </SidebarContent>
                  <SidebarFooter>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <ThemeToggle />
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Logout">
                          <LogOut />
                          <span>Logout</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarFooter>
                </Sidebar>
                <SidebarInset>
                  <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 px-6 bg-background/85 backdrop-blur-md border-b border-border/40 transition-all">
                    <SidebarTrigger className="-ml-1" />
                    <PageHeader />
                  </header>
                  <main className="flex-1 overflow-y-auto">{children}</main>
                </SidebarInset>
                <Toaster />
              </SidebarProvider>
            </HistoryProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
