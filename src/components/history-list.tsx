'use client';

import { useHistory } from '@/context/history-context';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { History as HistoryIcon } from 'lucide-react';
import Link from 'next/link';

export default function HistoryList() {
  const { history } = useHistory();

  return (
    <>
      <SidebarMenu>
          {history.length > 0 ? (
            history.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild variant="ghost" size="sm" tooltip={item.job_title}>
                  <Link href={`/analysis/${item.id}`}>
                    <HistoryIcon />
                    <span className="truncate">{item.job_title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
             <div className="mt-4 p-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <p>No history yet.</p>
            </div>
          )}
        </SidebarMenu>
    </>
  );
}
