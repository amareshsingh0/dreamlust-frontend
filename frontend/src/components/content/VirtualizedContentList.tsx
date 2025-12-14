import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';
import { cn } from '@/lib/utils';

interface VirtualizedContentListProps {
  content: Content[];
  isLoading?: boolean;
  estimateSize?: number;
  overscan?: number;
  className?: string;
}

/**
 * Virtualized Content List (Horizontal layout)
 * Uses @tanstack/react-virtual for efficient rendering of large lists
 * Optimized for horizontal/row-based content cards
 */
export function VirtualizedContentList({
  content,
  isLoading = false,
  estimateSize = 120, // Estimated height for horizontal card
  overscan = 5,
  className,
}: VirtualizedContentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: content.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ContentCardSkeleton key={i} variant="horizontal" />
        ))}
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No content available
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ maxHeight: '80vh' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ContentCard
              content={content[virtualItem.index]}
              variant="horizontal"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

