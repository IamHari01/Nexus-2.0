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
import { LogOut } from 'lucide-react';

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
                  <span className="text-xl font-semibold text-foreground group-data-[state=collapsed]:hidden">
                    NEXUS
                  </span>
                  <SidebarTrigger />
                </SidebarHeader>
                <SidebarContent>
                  <HistoryList />
                </SidebarContent>
                <SidebarFooter>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <ThemeToggle />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton variant="ghost" tooltip="Logout">
                        <LogOut />
                        <span>Logout</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarFooter>
              </Sidebar>
              <SidebarInset>
                <main className="flex-1">{children}</main>
              </SidebarInset>
              <Toaster />
            </SidebarProvider>
          </HistoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
