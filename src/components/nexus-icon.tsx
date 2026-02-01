import { cn } from '@/lib/utils';

export const NexusIcon = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <path d="M15.226 21.0001H19.226L12.026 3.00006H8.02601L15.226 21.0001Z" fill="currentColor" fillOpacity="0.6"/>
      <path d="M8.82599 21.0001H4.82599L12.026 3.00006H16.026L8.82599 21.0001Z" fill="currentColor"/>
    </svg>
  );
};
