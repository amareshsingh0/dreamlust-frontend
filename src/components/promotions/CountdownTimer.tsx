/**
 * Countdown Timer Component
 * Displays time remaining until a target date
 */

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: string | Date;
  className?: string;
  onComplete?: () => void;
}

export function CountdownTimer({ endTime, className, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const target = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  if (isComplete) {
    return (
      <div className={cn('flex items-center gap-2 text-destructive', className)}>
        <Clock className="h-4 w-4" />
        <span className="font-semibold">Ended</span>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1 text-sm font-medium">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
              {formatTime(timeLeft.days)}d
            </span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="bg-primary/10 text-primary px-2 py-1 rounded">
          {formatTime(timeLeft.hours)}h
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-primary/10 text-primary px-2 py-1 rounded">
          {formatTime(timeLeft.minutes)}m
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-primary/10 text-primary px-2 py-1 rounded">
          {formatTime(timeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
}

