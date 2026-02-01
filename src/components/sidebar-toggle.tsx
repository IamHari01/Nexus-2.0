'use client';

import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { NexusIcon } from './nexus-icon';

export function SidebarToggle() {
    const { toggleSidebar, state } = useSidebar();

    return (
        <SidebarMenuButton onClick={toggleSidebar}>
            <NexusIcon />
            <span>{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
        </SidebarMenuButton>
    )
}
