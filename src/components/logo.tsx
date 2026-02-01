import { cn } from "@/lib/utils";
import { NexusIcon } from "./nexus-icon";

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="NEXUS Logo">
      <div className="p-1.5 bg-primary rounded-lg">
        <NexusIcon className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className={cn("font-bold text-xl tracking-tight text-foreground", "group-data-[collapsible=icon]:hidden")}>NEXUS</span>
    </div>
  );
}
