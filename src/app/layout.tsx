import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
import { LogOut, LayoutDashboard, FileText } from 'lucide-react';
import Logo from '@/components/logo';
import Link from 'next/link';

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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <HistoryProvider>
            <SidebarProvider>
              <Sidebar collapsible="icon">
                <SidebarHeader>
                  <Logo />
                  <SidebarTrigger />
                </SidebarHeader>
                <SidebarContent>
                  <SidebarMenu className="px-2 pt-2 gap-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Resume Analyzer">
                        <Link href="/">
                          <FileText className="h-4 w-4" />
                          <span>Resume Analyzer</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Job Dashboard">
                        <Link href="/dashboard">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Job Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-data-[collapsible=icon]:hidden mt-4">
                    Analysis History
                  </div>
                  <HistoryList />
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
                <header className="flex h-12 shrink-0 items-center px-6">
                  <h1 className="text-2xl font-bold text-foreground">NEXUS</h1>
                </header>
                <main className="flex-1 overflow-y-auto">{children}</main>
              </SidebarInset>
              <Toaster />
            </SidebarProvider>
          </HistoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
