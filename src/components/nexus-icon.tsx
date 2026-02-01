import { cn } from "@/lib/utils"

export default function NexusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#nexus-gradient)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id="nexus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--destructive))" />
        </linearGradient>
      </defs>
      <path d="M6 20V4L18 20V4" />
    </svg>
  );
}
