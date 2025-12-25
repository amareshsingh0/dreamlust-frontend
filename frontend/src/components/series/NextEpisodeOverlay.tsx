/**
 * Next Episode Overlay
 * Shows countdown and option to play next episode
 */

import { Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  content: {
    id: string;
    thumbnail?: string;
    duration?: number;
  };
}

interface NextEpisodeOverlayProps {
  episode: Episode;
  countdown: number;
  onPlay: () => void;
  onCancel: () => void;
}

export function NextEpisodeOverlay({
  episode,
  countdown,
  onPlay,
  onCancel,
}: NextEpisodeOverlayProps) {
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle>Next Episode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {episode.content.thumbnail && (
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <OptimizedImage
                  src={episode.content.thumbnail}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                  width={128}
                  height={80}
                />
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                Episode {episode.episodeNumber}
              </div>
              <h3 className="font-semibold">{episode.title}</h3>
              {episode.content.duration && (
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDuration(episode.content.duration)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onPlay} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Play Now {countdown > 0 && `(${countdown}s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

