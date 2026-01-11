/**
 * Choice Branch Overlay Component
 * Allows users to choose different paths in the video
 */

import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Choice {
  label: string;
  timestamp: number;
  description?: string;
}

interface ChoiceBranchOverlayProps {
  prompt: string;
  choices: Choice[];
  onSelect: (choice: Choice) => void;
  onClose: () => void;
}

export function ChoiceBranchOverlay({
  prompt,
  choices,
  onSelect,
  onClose,
}: ChoiceBranchOverlayProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        <CardTitle className="pr-8">{prompt}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {choices.map((choice, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => onSelect(choice)}
          >
            <div className="flex items-start gap-3 w-full">
              <Play className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium">{choice.label}</div>
                {choice.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {choice.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Jump to {formatTime(choice.timestamp)}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

