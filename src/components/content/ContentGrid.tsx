import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';
import { cn } from '@/lib/utils';

interface ContentGridProps {
  content: Content[];
  variant?: 'default' | 'compact';
  columns?: 2 | 3 | 4 | 5;
  isLoading?: boolean;
  skeletonCount?: number;
}

export function ContentGrid({ 
  content, 
  variant = 'default', 
  columns = 4,
  isLoading = false,
  skeletonCount = 8
}: ContentGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  return (
    <div className={cn(
      'grid gap-6',
      gridCols[columns]
    )}>
      {content.map((item, index) => (
        <div 
          key={item.id}
          className="animate-fadeIn"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ContentCard content={item} variant={variant} />
        </div>
      ))}
    </div>
  );
}
