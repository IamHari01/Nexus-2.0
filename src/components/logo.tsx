import { NexusIcon } from './nexus-icon';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <NexusIcon className="h-6 w-6 text-foreground" />
      <span className="font-bold text-foreground">NEXUS</span>
    </div>
  );
}
