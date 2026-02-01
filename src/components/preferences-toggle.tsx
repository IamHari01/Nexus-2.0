'use client';

import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { Settings } from 'lucide-react';

export function PreferencesToggle() {
    const { toggleSidebar } = useSidebar();

    return (
        <SidebarMenuButton onClick={toggleSidebar}>
            <Settings />
            <span>Preferences</span>
        </SidebarMenuButton>
    )
}
