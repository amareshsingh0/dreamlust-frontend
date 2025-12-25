/**
 * Poll Overlay Component
 */

import { X, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PollOverlayProps {
  question: string;
  options: string[];
  onVote: (option: string) => void;
  results?: Record<string, number>;
  onClose: () => void;
}

export function PollOverlay({
  question,
  options,
  onVote,
  results,
  onClose,
}: PollOverlayProps) {
  const hasVoted = results !== undefined && Object.keys(results).length > 0;
  const totalVotes = hasVoted
    ? Object.values(results).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="pr-8">{question}</CardTitle>
        {hasVoted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{totalVotes} votes</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((option, index) => {
          const voteCount = results?.[index] || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

          return (
            <div key={index} className="space-y-1">
              {hasVoted ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{option}</span>
                    <span className="font-medium">{voteCount} ({Math.round(percentage)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onVote(index.toString())}
                >
                  {option}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

