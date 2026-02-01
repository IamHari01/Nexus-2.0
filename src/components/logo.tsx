import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="NEXUS Logo">
      <div className="p-1.5 bg-primary rounded-lg">
        <Target className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className={cn("font-bold text-xl tracking-tight text-foreground", "group-data-[collapsible=icon]:hidden")}>NEXUS</span>
    </div>
  );
}
