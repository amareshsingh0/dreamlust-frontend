import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 pr-2 cursor-pointer hover:bg-secondary/80 transition-colors",
        className
      )}
      onClick={onRemove}
    >
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

