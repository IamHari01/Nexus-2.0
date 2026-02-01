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
      <path
        d="M6 4V20H8V7.23L16.5 20H18V4H16V16.77L7.5 4H6Z"
        fill="currentColor"
      />
    </svg>
  );
};
