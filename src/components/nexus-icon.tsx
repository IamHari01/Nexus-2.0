import { cn } from "@/lib/utils"

export default function NexusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-8", className)}
    >
      <path d="M7 20V4" />
      <path d="M7 4l10 16" />
      <path d="M17 20V4" />
    </svg>
  );
}
