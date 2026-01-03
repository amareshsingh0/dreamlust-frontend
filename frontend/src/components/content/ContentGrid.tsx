import { Suspense } from 'react';
import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface ContentGridProps {
  content: Content[];
  variant?: 'default' | 'compact';
  columns?: 2 | 3 | 4 | 5;
  isLoading?: boolean;
  skeletonCount?: number;
  selectable?: boolean;
  selected?: string[];
  onToggle?: (contentId: string) => void;
}

export function ContentGrid({
  content,
  variant = 'default',
  columns = 4,
  isLoading: _isLoading = false,
  skeletonCount: _skeletonCount = 8,
  selectable = false,
  selected = [],
  onToggle
}: ContentGridProps) {
  // Deduplicate content by ID to prevent React key warnings
  const uniqueContent = content.filter(
    (item, index, self) => index === self.findIndex((c) => c.id === item.id)
  );

  const gridCols = {
    2: 'grid-cols-1 xs:grid-cols-2',
    3: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  const handleToggle = (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(contentId);
  };

  return (
    <div className={cn(
      'grid gap-3 sm:gap-4 md:gap-6',
      gridCols[columns]
    )}>
      {uniqueContent.map((item, index) => (
        <div 
          key={item.id}
          className={cn(
            "animate-fadeIn relative",
            selectable && "group"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {selectable && (
            <div className={cn(
              "absolute top-2 left-2 z-10 transition-opacity",
              selected.includes(item.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={() => onToggle?.(item.id)}
                onClick={(e) => handleToggle(item.id, e)}
                className={cn(
                  "bg-background/90 backdrop-blur-sm",
                  selected.includes(item.id) && "bg-primary border-primary"
                )}
              />
            </div>
          )}
          <Suspense fallback={<ContentCardSkeleton variant={variant} />}>
            <ContentCard 
              content={item} 
              variant={variant}
              className={selectable && selected.includes(item.id) ? 'ring-2 ring-primary' : ''}
            />
          </Suspense>
        </div>
      ))}
    </div>
  );
}
