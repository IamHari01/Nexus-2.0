'use client';

import { useHistory } from '@/context/history-context';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { History } from 'lucide-react';

export default function HistoryList() {
  const { history } = useHistory();

  if (history.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <History />
        <span>History</span>
      </SidebarGroupLabel>
      <SidebarMenu>
        {history.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild variant="ghost" size="sm">
              <a href="#">
                <span className="truncate">{item.job_title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
