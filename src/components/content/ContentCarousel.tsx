import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Content } from '@/types';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showViewAll && (
            <Button variant="ghost" size="sm" asChild>
              <a href={viewAllPath}>View All</a>
            </Button>
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
      <div className="relative -mx-4 px-4 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 w-[280px] sm:w-[300px] animate-pulse"
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
                className="flex-shrink-0 w-[280px] sm:w-[300px]"
              >
                <ContentCard content={item} variant="compact" />
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
