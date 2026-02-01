'use client';

import { useHistory } from '@/context/history-context';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { FilePlus2, History as HistoryIcon } from 'lucide-react';

export default function HistoryList() {
  const { history } = useHistory();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="New Analysis">
            <a href="/">
              <FilePlus2 />
              <span>New Analysis</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarMenu>
          {history.length > 0 ? (
            history.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild variant="ghost" size="sm" tooltip={item.job_title}>
                  <a href="#">
                    <HistoryIcon />
                    <span className="truncate">{item.job_title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
             <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <p>No history yet.</p>
            </div>
          )}
        </SidebarMenu>
    </>
  );
}
