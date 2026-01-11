import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AmountSelectorProps {
  amounts: number[];
  selected?: number;
  onSelect: (amount: number) => void;
  currency?: string;
  className?: string;
}

export function AmountSelector({
  amounts,
  selected,
  onSelect,
  currency: _currency = 'INR',
  className,
}: AmountSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {amounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={selected === amount ? 'default' : 'outline'}
            onClick={() => onSelect(amount)}
            className={cn(
              'h-16 text-lg font-semibold',
              selected === amount && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            ₹{amount}
          </Button>
        ))}
      </div>
      {selected && (
        <p className="text-sm text-muted-foreground text-center">
          Selected: ₹{selected.toFixed(0)}
        </p>
      )}
    </div>
  );
}

