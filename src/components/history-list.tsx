'use client';

import { useHistory } from '@/context/history-context';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { FilePlus2, History as HistoryIcon } from 'lucide-react';

export default function HistoryList() {
  const { history } = useHistory();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a href="/">
              <FilePlus2 />
              <span>New Analysis</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2">
          <HistoryIcon />
          Recent
        </SidebarGroupLabel>
        <SidebarMenu className="p-0">
          {history.length > 0 ? (
            history.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild variant="ghost" size="sm">
                  <a href="#">
                    <span className="truncate">{item.job_title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            <p className="px-2 text-xs text-muted-foreground">No history yet.</p>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
