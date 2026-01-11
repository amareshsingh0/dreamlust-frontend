import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

export function CommentSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-6 w-32" />
      </div>
      
      {/* Comment input skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Comments list skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

