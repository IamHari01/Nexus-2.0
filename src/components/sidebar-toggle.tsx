'use client';

import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { Target } from 'lucide-react';

export function SidebarToggle() {
    const { toggleSidebar, state } = useSidebar();

    return (
        <SidebarMenuButton onClick={toggleSidebar}>
            <Target />
            <span>{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
        </SidebarMenuButton>
    )
}
