import { cn } from "@/lib/utils";

export default function NexusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-10 w-10 shrink-0", className)}
    >
      <defs>
        {/* Glowing aura gradient */}
        <radialGradient id="aura-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
        
        {/* Left vertical bar gradient */}
        <linearGradient id="left-bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Right vertical bar gradient */}
        <linearGradient id="right-bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="50%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#A21CAF" />
        </linearGradient>

        {/* Diagonal link gradient representing connection/nexus */}
        <linearGradient id="diagonal-slash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Glow filter for neon effect */}
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Futuristic Background Glow Aura */}
      <circle cx="50" cy="50" r="45" fill="url(#aura-gradient)" />

      {/* Left Pillar */}
      <path
        d="M26 22C26 19.8 27.8 18 30 18C32.2 18 34 19.8 34 22V78C34 80.2 32.2 82 30 82C27.8 82 26 80.2 26 78V22Z"
        fill="url(#left-bar-grad)"
      />

      {/* Right Pillar */}
      <path
        d="M66 22C66 19.8 67.8 18 70 18C72.2 18 74 19.8 74 22V78C74 80.2 72.2 82 70 82C67.8 82 66 80.2 66 78V22Z"
        fill="url(#right-bar-grad)"
      />

      {/* Overlapping Diagonal Slash Connecting the Pillars */}
      <path
        d="M29.5 24.5 L70.5 75.5"
        stroke="url(#diagonal-slash-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        filter="url(#neon-glow)"
      />

      {/* Technology node dots representing intersection points */}
      <circle cx="30" cy="24.5" r="4.5" fill="#FFFFFF" className="animate-pulse" />
      <circle cx="70" cy="75.5" r="4.5" fill="#FFFFFF" className="animate-pulse" />
    </svg>
  );
}
