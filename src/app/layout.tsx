import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Logo } from '@/components/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { HistoryProvider } from '@/context/history-context';
import HistoryList from '@/components/history-list';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'NEXUS',
  description: 'Maximize your shortlisting probability with AI-driven resume analysis and personalized learning paths.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable)} suppressHydrationWarning>
        <HistoryProvider>
          <SidebarProvider>
            <Sidebar collapsible="icon">
              <SidebarHeader>
                <a href="/" aria-label="Home">
                  <Logo />
                </a>
                <SidebarTrigger />
              </SidebarHeader>
              <SidebarContent>
                <HistoryList />
              </SidebarContent>
            </Sidebar>
            <SidebarInset>
              <main className="flex-1">{children}</main>
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </HistoryProvider>
      </body>
    </html>
  );
}
