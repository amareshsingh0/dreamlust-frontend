import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ContentCardSkeletonProps {
  variant?: 'default' | 'compact' | 'horizontal';
  count?: number;
}

export function ContentCardSkeleton({ variant = 'default', count = 1 }: ContentCardSkeletonProps) {
  if (variant === 'horizontal') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-xl">
            <Skeleton className="w-40 h-24 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("space-y-3", variant === 'compact' && 'space-y-2')}>
          {/* Thumbnail skeleton */}
          <Skeleton className="w-full aspect-video rounded-xl" />
          
          {/* Content info skeleton */}
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-3 mt-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

