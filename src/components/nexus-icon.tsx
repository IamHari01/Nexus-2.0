import { cn } from '@/lib/utils';

export const NexusIcon = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      {...props}
    >
        <path d="M20.0002 0.333496C16.036 0.333496 12.2044 1.55447 8.94814 3.79159C5.69188 6.02871 3.16683 9.17513 1.71683 12.8335L1.722 12.8228C1.71941 12.8273 1.71683 12.8318 1.71683 12.8335L8.3335 16.1428V23.8575L1.71683 27.1668C3.16683 30.8252 5.69188 33.9716 8.94814 36.2087C12.2044 38.4458 16.036 39.6668 20.0002 39.6668C23.9643 39.6668 27.796 38.4458 31.0522 36.2087C34.3085 33.9716 36.8335 30.8252 38.2835 27.1668L31.6668 23.8575V16.1428L38.2835 12.8335C36.8335 9.17513 34.3085 6.02871 31.0522 3.79159C27.796 1.55447 23.9643 0.333496 20.0002 0.333496Z" fill="hsl(var(--foreground))"></path>
        <path d="M20 13.5417L26.6167 10V21.3542L20 24.8958V13.5417Z" fill="hsl(var(--background))"></path>
        <path d="M13.3833 10L20 13.5417V24.8958L13.3833 21.3542V10Z" fill="hsl(var(--background))"></path>
        <path d="M20 26.4583L26.6167 22.9167V29.7917L20 33.3333V26.4583Z" fill="hsl(var(--background))"></path>
        <path d="M13.3833 22.9167L20 26.4583V33.3333L13.3833 29.7917V22.9167Z" fill="hsl(var(--background))"></path>
        <path d="M6.7666 14.375L13.3833 17.9167V11.0417L6.7666 7.5V14.375Z" fill="hsl(var(--background))"></path>
        <path d="M26.6167 17.9167L33.2333 14.375V7.5L26.6167 11.0417V17.9167Z" fill="hsl(var(--background))"></path>
        <path d="M13.3833 28.9583V22.0833L6.7666 25.625V32.5L13.3833 28.9583Z" fill="hsl(var(--background))"></path>
        <path d="M33.2333 25.625L26.6167 22.0833V28.9583L33.2333 32.5V25.625Z" fill="hsl(var(--background))"></path>
    </svg>
  );
};
