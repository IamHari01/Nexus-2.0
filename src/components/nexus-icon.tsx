import { cn } from "@/lib/utils"

export default function NexusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-6 w-6", className)}
    >
      <path d="M7 3v18h1l10-14h1v1" />
      <path d="M17 21V3h-1l-10 14h-1v-1" />
    </svg>
  );
}
