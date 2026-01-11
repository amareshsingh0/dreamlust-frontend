/**
 * Quiz Overlay Component
 */

import { X, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

interface QuizOverlayProps {
  question: string;
  options: string[];
  correctAnswer: number;
  onAnswer: (answer: string) => void;
  onClose: () => void;
}

export function QuizOverlay({
  question,
  options,
  correctAnswer,
  onAnswer,
  onClose,
}: QuizOverlayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(index);
    setHasAnswered(true);
    onAnswer(index.toString());
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
        <CardTitle className="pr-8">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === correctAnswer;
          const showResult = hasAnswered;

          let variant: 'default' | 'outline' | 'secondary' = 'outline';
          if (showResult) {
            if (isCorrect) {
              variant = 'default';
            } else if (isSelected && !isCorrect) {
              variant = 'secondary';
            }
          }

          return (
            <Button
              key={index}
              variant={variant}
              className="w-full justify-start relative"
              onClick={() => handleSelect(index)}
              disabled={hasAnswered}
            >
              <span className="flex-1 text-left">{option}</span>
              {showResult && isCorrect && (
                <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />
              )}
              {showResult && isSelected && !isCorrect && (
                <XCircle className="h-4 w-4 ml-2 text-red-500" />
              )}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

