import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ContentCardSkeletonProps {
  variant?: 'default' | 'compact' | 'horizontal';
}

/**
 * Skeleton loader for ContentCard component
 * Matches the structure and layout of ContentCard
 */
export function ContentCardSkeleton({ variant = 'default' }: ContentCardSkeletonProps) {
  if (variant === 'horizontal') {
    return (
      <div className="flex gap-4 p-3 rounded-xl animate-pulse">
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center gap-2 mt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group block rounded-xl overflow-hidden space-y-3",
      variant === 'compact' ? 'space-y-2' : 'space-y-3'
    )}>
      {/* Thumbnail skeleton */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted animate-pulse" />
      
      {/* Content info skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className={cn(
            "h-4 rounded",
            variant === 'compact' ? 'w-3/4' : 'w-full'
          )} />
          <Skeleton className="h-3 w-1/2 rounded" />
          <div className="flex items-center gap-3 mt-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
