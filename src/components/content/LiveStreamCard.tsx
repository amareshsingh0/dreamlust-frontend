import { Link } from 'react-router-dom';
import { Radio, Eye, Zap } from 'lucide-react';
import { Content } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface LiveStreamCardProps {
  stream: Content & { viewers?: number };
  variant?: 'default' | 'upcoming';
  startsIn?: string; // For upcoming streams
}

function formatViewers(viewers: number): string {
  if (viewers >= 1000) {
    return `${(viewers / 1000).toFixed(1)}K`;
  }
  return viewers.toString();
}

export function LiveStreamCard({ stream, variant = 'default', startsIn }: LiveStreamCardProps) {
  const isUpcoming = variant === 'upcoming';

  const streamUrl = stream.type === 'live' || stream.isLive 
    ? `/watch/live/${stream.id}`
    : `/watch/${stream.id}`;

  return (
    <Link 
      to={streamUrl}
      className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img 
          src={stream.thumbnail} 
          alt={stream.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        
        {/* Live/Scheduled Badge - Top Left */}
        <div className="absolute top-3 left-3">
          {isUpcoming ? (
            <Badge className="bg-secondary/90 backdrop-blur-sm text-foreground border-0">
              Scheduled
            </Badge>
          ) : (
            <Badge className="bg-destructive text-destructive-foreground border-0 flex items-center gap-1.5 px-2.5 py-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>

        {/* Play Overlay - Center (for live streams) */}
        {!isUpcoming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 group-hover:scale-110 transition-transform duration-300">
              <div className="relative">
                <Radio className="h-10 w-10 text-white" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/30" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Viewer Count - Bottom Left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2.5 py-1.5 rounded-md">
          <Eye className="h-4 w-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            {stream.viewers ? `${formatViewers(stream.viewers)} watching` : 'Live'}
          </span>
        </div>

        {/* Countdown Timer - Bottom (for upcoming) */}
        {isUpcoming && startsIn && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md">
              <p className="text-sm font-medium text-foreground">
                Starts in {startsIn}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Creator Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/50 transition-colors flex-shrink-0">
            <AvatarImage src={stream.creator.avatar} alt={stream.creator.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {stream.creator.name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
              {stream.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-sm text-muted-foreground">
                {stream.creator.name}
              </p>
              {stream.creator.isVerified && (
                <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

