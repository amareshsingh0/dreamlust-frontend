import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for VideoCard component
 * Used for video content cards in lists
 */
export function VideoCardSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {/* Video thumbnail */}
      <div className="aspect-video bg-muted rounded-lg" />
      
      {/* Video info */}
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 bg-muted rounded w-3/4" />
        <Skeleton className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

