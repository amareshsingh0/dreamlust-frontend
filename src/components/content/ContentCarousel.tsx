import { useRef, Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';
import { Button } from '@/components/ui/button';

interface ContentCarouselProps {
  title: string;
  description?: string;
  content: Content[];
  showViewAll?: boolean;
  viewAllPath?: string;
  loading?: boolean;
}

export function ContentCarousel({ 
  title,
  description,
  content, 
  showViewAll = true,
  viewAllPath = '/explore',
  loading = false
}: ContentCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="min-w-0 flex-1 mr-2">
          <h2 className="font-display text-base sm:text-lg md:text-xl font-bold truncate">{title}</h2>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {showViewAll && (
            <a
              href={viewAllPath}
              className="text-xs sm:text-sm font-medium text-foreground hover:text-foreground/80 transition-colors h-8 px-2 sm:px-3 flex items-center"
            >
              View All
            </a>
          )}
          <div className="hidden sm:flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 sm:pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] xs:w-[240px] sm:w-[280px] md:w-[300px] animate-pulse snap-start"
              >
                <div className="aspect-video bg-muted rounded-lg mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : content.length > 0 ? (
            content.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-[200px] xs:w-[240px] sm:w-[280px] md:w-[300px] snap-start"
              >
                <Suspense fallback={<ContentCardSkeleton variant="compact" />}>
                  <ContentCard content={item} variant="compact" />
                </Suspense>
              </div>
            ))
          ) : (
            <div className="w-full py-8 text-center text-muted-foreground">
              No content available
            </div>
          )}
        </div>
        
        {/* Gradient edges */}
        <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
