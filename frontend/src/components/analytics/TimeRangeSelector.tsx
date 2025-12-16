import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

const optionLabels: Record<string, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  '1y': '1 Year',
  'all': 'All Time',
};

export function TimeRangeSelector({
  value,
  options,
  onChange,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option}
          variant={value === option ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option)}
        >
          {optionLabels[option] || option}
        </Button>
      ))}
    </div>
  );
}

