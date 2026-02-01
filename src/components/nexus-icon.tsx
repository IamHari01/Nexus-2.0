import { cn } from "@/lib/utils";

export const NexusIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => {
  return (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-6 w-6", className)}
        {...props}
    >
        <path d="M8 17V7l8 10V7" />
    </svg>
  );
};
