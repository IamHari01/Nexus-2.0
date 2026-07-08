'use client';

import { useHistory } from '@/context/history-context';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Trash2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function HistoryList() {
  const { history, deleteHistoryItem } = useHistory();
  const searchParams = useSearchParams();
  const activeId = searchParams ? searchParams.get('id') : null;

  return (
    <SidebarMenu className="px-2 gap-1.5">
      {history.length > 0 ? (
        history.map((item) => {
          const isActive = item.id === activeId;
          const score = item.result.shortlist_probability;
          const displayScore = score > 0 && score <= 1 ? Math.round(score * 100) : Math.round(score);
          const scoreColor = displayScore >= 75 
            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20' 
            : displayScore >= 40 
              ? 'text-amber-400 border-amber-500/20 bg-amber-950/20' 
              : 'text-rose-400 border-rose-500/20 bg-rose-950/20';

          return (
            <SidebarMenuItem key={item.id} className="group/item relative">
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={`${item.job_title} at ${item.company} (${displayScore}% Match)`}
                className={`w-full transition-all duration-300 rounded-lg h-auto py-2.5 px-3 border border-transparent flex items-center justify-between gap-2.5 ${
                  isActive
                    ? 'bg-slate-900/50 border-slate-800 text-slate-100 shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]'
                    : 'text-slate-400 hover:text-slate-205 hover:bg-slate-900/30'
                }`}
              >
                <Link href={`/?id=${item.id}`} className="flex items-center justify-between w-full min-w-0">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Sparkles className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform duration-300 ${isActive ? 'text-indigo-400 scale-105' : 'text-slate-500 group-hover/item:text-slate-350'}`} />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="font-semibold text-[11px] text-foreground truncate max-w-[130px] group-data-[collapsible=icon]:hidden">
                        {item.job_title}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[130px] group-data-[collapsible=icon]:hidden mt-0.5">
                        {item.company}
                      </span>
                    </div>
                  </div>
                  
                  {/* Match Score Badge */}
                  <Badge className={`text-[9px] font-extrabold h-4.5 px-1.5 rounded border shrink-0 group-data-[collapsible=icon]:hidden ${scoreColor}`}>
                    {displayScore}%
                  </Badge>
                </Link>
              </SidebarMenuButton>

              {/* Hover Trash Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteHistoryItem(item.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 h-6 w-6 rounded bg-slate-950 hover:bg-rose-950/30 hover:text-rose-400 border border-slate-900 flex items-center justify-center text-slate-500 transition-all duration-200 group-data-[collapsible=icon]:hidden z-10"
                title="Delete history item"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </SidebarMenuItem>
          );
        })
      ) : (
        <div className="mt-4 p-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p>No history yet.</p>
        </div>
      )}
    </SidebarMenu>
  );
}
