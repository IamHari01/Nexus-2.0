'use client';
import NexusIcon from './nexus-icon';

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-extrabold text-foreground tracking-wider text-sm">
      <NexusIcon className="h-8 w-8" />
      <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
        <span className="bg-gradient-to-r from-indigo-100 via-slate-200 to-indigo-200 bg-clip-text text-transparent uppercase tracking-widest font-black">NEXUS</span>
        <span className="text-[9px] px-1.5 py-0.25 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-bold uppercase tracking-normal">2.0</span>
      </div>
    </div>
  );
}
