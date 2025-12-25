/**
 * Interactive Video Player Component
 * Supports polls, quizzes, choice branches, and hotspots
 */

import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { PollOverlay } from './PollOverlay';
import { QuizOverlay } from './QuizOverlay';
import { ChoiceBranchOverlay } from './ChoiceBranchOverlay';
import { HotspotOverlay } from './HotspotOverlay';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface InteractiveElement {
  id: string;
  contentId: string;
  type: 'poll' | 'quiz' | 'choice_branch' | 'hotspot';
  timestamp: number;
  data: any;
  createdAt?: string;
}

interface InteractiveVideoPlayerProps {
  contentId: string;
  videoUrl: string;
  poster?: string;
  autoplay?: boolean;
  onProductInfo?: (productId: string) => void;
  className?: string;
}

export function InteractiveVideoPlayer({
  contentId,
  videoUrl,
  poster,
  autoplay = false,
  onProductInfo,
  className,
}: InteractiveVideoPlayerProps) {
  const [elements, setElements] = useState<InteractiveElement[]>([]);
  const [currentElement, setCurrentElement] = useState<InteractiveElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [pollResults, setPollResults] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Load interactive elements
  useEffect(() => {
    const loadElements = async () => {
      try {
        const response = await api.interactive.getElements<InteractiveElement[]>(contentId);
        if (response.success && response.data) {
          setElements(response.data);
        }
      } catch (error) {
        console.error('Failed to load interactive elements:', error);
      }
    };

    loadElements();
  }, [contentId]);

  // Check for elements at current timestamp
  useEffect(() => {
    if (elements.length === 0 || currentElement) return;

    const element = elements.find(
      (el) => Math.abs(el.timestamp - currentTime) < 1
    );

    if (element) {
      setCurrentElement(element);
      
      // Load poll results if it's a poll
      if (element.type === 'poll') {
        loadPollResults(element.id);
      }
    }
  }, [currentTime, elements, currentElement]);

  // Reset current element when time moves away
  useEffect(() => {
    if (currentElement && Math.abs(currentElement.timestamp - currentTime) > 2) {
      setCurrentElement(null);
    }
  }, [currentTime, currentElement]);

  const loadPollResults = async (elementId: string) => {
    try {
      const response = await api.interactive.getElementResponses<Array<{ response: any }>>(elementId);
      if (response.success && response.data) {
        const results: Record<string, number> = {};
        response.data.forEach((r) => {
          const answer = r.response?.answer || r.response?.choice;
          if (answer !== undefined) {
            results[answer] = (results[answer] || 0) + 1;
          }
        });
        setPollResults(results);
      }
    } catch (error) {
      console.error('Failed to load poll results:', error);
    }
  };

  const handlePollVote = async (option: string) => {
    if (!currentElement) return;

    try {
      const response = await api.interactive.submitResponse({
        elementId: currentElement.id,
        response: { answer: option },
      });

      if (response.success) {
        toast({
          title: 'Vote submitted',
          description: 'Your vote has been recorded.',
        });
        
        // Update local results
        setPollResults((prev) => ({
          ...prev,
          [option]: (prev[option] || 0) + 1,
        }));

        // Close overlay after a delay
        setTimeout(() => {
          setCurrentElement(null);
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        variant: 'destructive',
      });
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (!currentElement) return;

    const isCorrect = answer === currentElement.data.correct;
    
    try {
      await api.interactive.submitResponse({
        elementId: currentElement.id,
        response: { answer, isCorrect },
      });

      toast({
        title: isCorrect ? 'Correct!' : 'Incorrect',
        description: isCorrect 
          ? 'Well done!' 
          : `The correct answer is: ${currentElement.data.options[currentElement.data.correct]}`,
        variant: isCorrect ? 'default' : 'destructive',
      });

      setTimeout(() => {
        setCurrentElement(null);
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit answer',
        variant: 'destructive',
      });
    }
  };

  const handleChoiceSelect = (choice: { timestamp: number }) => {
    if (videoRef.current) {
      videoRef.current.currentTime = choice.timestamp;
      setCurrentElement(null);
    }
  };

  const handleHotspotClick = (hotspot: { productId?: string }) => {
    if (hotspot.productId && onProductInfo) {
      onProductInfo(hotspot.productId);
    }
    setCurrentElement(null);
  };

  const closeOverlay = () => {
    setCurrentElement(null);
  };

  return (
    <div className={`relative ${className}`} id={`interactive-player-${contentId}`}>
      <VideoPlayer
        src={videoUrl}
        poster={poster}
        autoplay={autoplay}
      />
      
      {/* Hidden video element for time tracking */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(Math.floor(video.currentTime));
        }}
      />

      {/* Interactive Overlay */}
      {currentElement && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {currentElement.type === 'poll' && (
            <PollOverlay
              question={currentElement.data.question}
              options={currentElement.data.options}
              onVote={handlePollVote}
              results={pollResults}
              onClose={closeOverlay}
            />
          )}

          {currentElement.type === 'quiz' && (
            <QuizOverlay
              question={currentElement.data.question}
              options={currentElement.data.options}
              correctAnswer={currentElement.data.correct}
              onAnswer={handleQuizAnswer}
              onClose={closeOverlay}
            />
          )}

          {currentElement.type === 'choice_branch' && (
            <ChoiceBranchOverlay
              prompt={currentElement.data.prompt}
              choices={currentElement.data.choices}
              onSelect={handleChoiceSelect}
              onClose={closeOverlay}
            />
          )}

          {currentElement.type === 'hotspot' && (
            <HotspotOverlay
              hotspots={currentElement.data.hotspots}
              onHotspotClick={handleHotspotClick}
              onClose={closeOverlay}
            />
          )}
        </div>
      )}
    </div>
  );
}

