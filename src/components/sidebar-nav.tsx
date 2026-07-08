'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Resume Analyzer',
      href: '/',
      icon: FileText,
      tooltip: 'Analyze resume against job specifications',
    },
    {
      label: 'Job Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      tooltip: 'Real-time job aggregation feed and matching analytics',
    },
  ];

  return (
    <SidebarMenu className="px-2 pt-2 gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.tooltip}
              className={`transition-all duration-300 rounded-xl py-6 px-4 border-l-4 h-12 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-950/45 via-indigo-900/10 to-transparent text-indigo-300 border-indigo-500 font-extrabold shadow-[0_4px_16px_rgba(99,102,241,0.06)]'
                  : 'text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-900/50 hover:border-slate-800/80'
              }`}
            >
              <Link href={item.href} className="flex items-center gap-3 w-full">
                <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? 'text-indigo-400 scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="text-[13px] tracking-wide font-semibold">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
