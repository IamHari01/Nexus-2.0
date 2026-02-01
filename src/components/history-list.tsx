'use client';

import { useHistory } from '@/context/history-context';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { FilePlus2 } from 'lucide-react';

export default function HistoryList() {
  const { history } = useHistory();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <a href="/">
            <FilePlus2 />
            <span>New Analysis</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>

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
  );
}
