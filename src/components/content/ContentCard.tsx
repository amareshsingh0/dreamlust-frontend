import { Link } from 'react-router-dom';
import { Play, Eye, Heart, Clock, Zap, Crown } from 'lucide-react';
import { Content } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ContentCardProps {
  content: Content;
  variant?: 'default' | 'compact' | 'horizontal';
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function ContentCard({ content, variant = 'default' }: ContentCardProps) {
  const isLive = content.type === 'live' || content.isLive;
  
  if (variant === 'horizontal') {
    return (
      <Link 
        to={`/watch/${content.id}`}
        className="flex gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all duration-300 group"
      >
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={content.thumbnail} 
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <span className={cn(
            "absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium",
            isLive ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-background/80 text-foreground"
          )}>
            {isLive ? '🔴 LIVE' : content.duration}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {content.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{content.creator.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatViews(content.views)} views</span>
            <span>•</span>
            <span>{formatDate(content.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={`/watch/${content.id}`}
      className={cn(
        "group block rounded-xl overflow-hidden hover-lift",
        variant === 'compact' ? 'space-y-2' : 'space-y-3'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
        <img 
          src={content.thumbnail} 
          alt={content.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration/Live badge */}
        <span className={cn(
          "absolute bottom-2 right-2 px-2 py-1 rounded-md text-xs font-medium",
          isLive 
            ? "bg-destructive text-destructive-foreground animate-pulse flex items-center gap-1" 
            : "bg-background/80 backdrop-blur-sm text-foreground"
        )}>
          {isLive ? (
            <>
              <span className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </>
          ) : content.duration}
        </span>

        {/* Premium badge */}
        {content.isPremium && (
          <Badge className="absolute top-2 left-2 bg-gradient-to-r from-primary to-accent border-0">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}

        {/* Content type badge */}
        {content.type === 'vr' && (
          <Badge className="absolute top-2 right-2 bg-secondary/80 backdrop-blur-sm">
            VR
          </Badge>
        )}

        {/* Quality badges */}
        {content.quality.includes('4K') && !content.isPremium && (
          <Badge variant="secondary" className="absolute top-2 left-2 bg-secondary/80 backdrop-blur-sm">
            4K
          </Badge>
        )}
      </div>

      {/* Content info */}
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/50 transition-colors">
          <AvatarImage src={content.creator.avatar} />
          <AvatarFallback>{content.creator.name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium line-clamp-2 group-hover:text-primary transition-colors",
            variant === 'compact' ? 'text-sm' : 'text-base'
          )}>
            {content.title}
          </h3>
          
          <Link 
            to={`/creator/${content.creator.username}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 block"
            onClick={(e) => e.stopPropagation()}
          >
            {content.creator.name}
            {content.creator.isVerified && (
              <Zap className="inline h-3 w-3 ml-1 text-primary" />
            )}
          </Link>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(content.views)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatViews(content.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(content.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
