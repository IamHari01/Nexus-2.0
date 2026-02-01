import { Target } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="NexusTalent AI Logo">
      <div className="p-1.5 bg-primary rounded-lg">
        <Target className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className="font-bold text-xl tracking-tight text-foreground">NexusTalent AI</span>
    </div>
  );
}
