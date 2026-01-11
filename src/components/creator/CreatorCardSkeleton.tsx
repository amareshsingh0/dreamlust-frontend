import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CreatorCardSkeletonProps {
  variant?: 'default' | 'compact';
  count?: number;
}

export function CreatorCardSkeleton({ variant = 'default', count = 1 }: CreatorCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("rounded-xl p-4 space-y-4", variant === 'compact' && 'p-3 space-y-3')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className={cn(
                "rounded-full flex-shrink-0",
                variant === 'compact' ? "h-12 w-12" : "h-16 w-16"
              )} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          {variant !== 'compact' && (
            <>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </>
          )}
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}

