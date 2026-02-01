import { cn } from "@/lib/utils";

export const NexusIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => {
  return (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-6 w-6", className)}
        {...props}
    >
        <path d="M17.526 24V9.632L9.998 24H2V0h8.013v14.368L17.526 0H22v24h-4.474zM9.54 6.132c-1.635 1.5-3.213 2.94-4.71 4.32V2.4h4.71v3.732zm7.95 11.736c1.635-1.5,3.213-2.94-4.71-4.32v8.052h-4.71v-3.732z"/>
    </svg>
  );
};
