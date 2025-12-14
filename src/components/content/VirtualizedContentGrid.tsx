import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';
import { cn } from '@/lib/utils';

interface VirtualizedContentGridProps {
  content: Content[];
  columns?: 2 | 3 | 4 | 5;
  isLoading?: boolean;
  estimateSize?: number;
  overscan?: number;
  className?: string;
}

/**
 * Virtualized Content Grid
 * Uses @tanstack/react-virtual for efficient rendering of large lists
 * Only renders visible items, improving performance for 100+ items
 */
export function VirtualizedContentGrid({
  content,
  columns = 4,
  isLoading = false,
  estimateSize = 350, // Estimated height per row
  overscan = 5,
  className,
}: VirtualizedContentGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate items per row based on columns
  const itemsPerRow = columns;
  const rowCount = Math.ceil(content.length / itemsPerRow);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (isLoading) {
    return (
      <div className={cn('grid gap-6', getGridCols(columns))}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ContentCardSkeleton key={i} />
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
      className={cn('h-screen overflow-auto', className)}
      style={{ maxHeight: '80vh' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * itemsPerRow;
          const endIndex = Math.min(startIndex + itemsPerRow, content.length);
          const rowItems = content.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={cn('grid gap-6 h-full', getGridCols(columns))}>
                {rowItems.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
                {/* Fill empty slots in last row */}
                {rowItems.length < itemsPerRow &&
                  Array.from({ length: itemsPerRow - rowItems.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGridCols(columns: number): string {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };
  return gridCols[columns] || gridCols[4];
}

