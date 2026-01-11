import { cn } from '@/lib/utils';

interface UnreadDotProps {
  className?: string;
}

export function UnreadDot({ className }: UnreadDotProps) {
  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full bg-primary',
        className
      )}
    />
  );
}

