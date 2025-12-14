import { Skeleton } from '@/components/ui/skeleton';
import { Play } from 'lucide-react';

export function VideoPlayerSkeleton() {
  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
      {/* Video area skeleton */}
      <Skeleton className="absolute inset-0" />
      
      {/* Play button skeleton */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center">
            <Play className="h-8 w-8 text-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
        <div className="space-y-2">
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

