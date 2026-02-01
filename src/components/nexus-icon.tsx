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
      <path d="M4 20V4l16 16V4" />
    </svg>
  );
}
