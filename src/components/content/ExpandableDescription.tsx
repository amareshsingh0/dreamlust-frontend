import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
  className?: string;
}

export function ExpandableDescription({
  description,
  maxLines = 3,
  className,
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measuredRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && measuredRef.current) {
      // Get the line height to calculate max height
      const lineHeight = parseFloat(
        getComputedStyle(contentRef.current).lineHeight || '24'
      );
      const maxHeight = lineHeight * maxLines;
      const actualHeight = measuredRef.current.scrollHeight;

      setShowToggle(actualHeight > maxHeight + 10); // Add small buffer
    }
  }, [description, maxLines]);

  if (!description) {
    return (
      <p className={cn('text-muted-foreground', className)}>
        No description available.
      </p>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Hidden element to measure full content height */}
      <div
        ref={measuredRef}
        className="absolute opacity-0 pointer-events-none w-full"
        aria-hidden="true"
      >
        <p className="whitespace-pre-wrap break-words">{description}</p>
      </div>

      {/* Visible content */}
      <div
        ref={contentRef}
        className={cn(
          'relative overflow-hidden transition-all duration-300 ease-in-out',
          !isExpanded && showToggle && 'max-h-[4.5rem]'
        )}
        style={{
          maxHeight: isExpanded ? '2000px' : undefined,
        }}
      >
        <p className="text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
          {description}
        </p>

        {/* Gradient fade effect when collapsed */}
        {!isExpanded && showToggle && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Toggle button */}
      {showToggle && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'group flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg',
            'text-sm font-medium text-primary',
            'bg-primary/5 hover:bg-primary/10',
            'border border-primary/20 hover:border-primary/40',
            'transition-all duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background'
          )}
        >
          <span>{isExpanded ? 'Show less' : 'Read more'}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          ) : (
            <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          )}
        </button>
      )}
    </div>
  );
}
