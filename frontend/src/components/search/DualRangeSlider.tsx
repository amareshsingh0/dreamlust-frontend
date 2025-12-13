import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  unit?: string;
  className?: string;
}

export function DualRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  unit = '',
  className,
}: DualRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  const handleSliderChange = useCallback((newValue: number[]) => {
    const [minVal, maxVal] = newValue as [number, number];
    setLocalValue([minVal, maxVal]);
    onChange([minVal, maxVal]);
  }, [onChange]);

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.max(min, Math.min(parseInt(e.target.value) || min, localValue[1]));
    setLocalValue([newMin, localValue[1]]);
    onChange([newMin, localValue[1]]);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.min(max, Math.max(parseInt(e.target.value) || max, localValue[0]));
    setLocalValue([localValue[0], newMax]);
    onChange([localValue[0], newMax]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="min-input" className="text-xs text-muted-foreground mb-1 block">
            Min {unit}
          </Label>
          <Input
            id="min-input"
            name="min-input"
            type="number"
            min={min}
            max={max}
            value={localValue[0]}
            onChange={handleMinInputChange}
            className="h-9"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="max-input" className="text-xs text-muted-foreground mb-1 block">
            Max {unit}
          </Label>
          <Input
            id="max-input"
            name="max-input"
            type="number"
            min={min}
            max={max}
            value={localValue[1]}
            onChange={handleMaxInputChange}
            className="h-9"
          />
        </div>
      </div>
      <Slider
        value={[localValue[0], localValue[1]]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

