'use client';
import NexusIcon from './nexus-icon';
import { useSidebar } from '@/components/ui/sidebar';

export default function Logo() {
  const { state } = useSidebar();
  return (
    <div className="flex items-center gap-2 font-semibold text-foreground">
      <NexusIcon />
      {state === 'expanded' && <span className="text-xl">NEXUS</span>}
    </div>
  );
}
