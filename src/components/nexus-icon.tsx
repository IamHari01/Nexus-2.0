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
        <path d="M5 3H8V21H5V3Z" />
        <path d="M16 3H19V21H16V3Z" />
        <path d="M8.2 4.9L16 14.1V11.5L9.5 3H8.2V4.9Z" />
        <path d="M8.2 9.9L16 19.1V16.5L9.5 8H8.2V9.9Z" />
        <path d="M8.2 14.9L14.5 21H16V19.1L9.5 13H8.2V14.9Z" />
    </svg>
  );
};
