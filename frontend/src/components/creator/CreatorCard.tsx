import { Link } from 'react-router-dom';
import { Users, Video, Check } from 'lucide-react';
import { Creator } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CreatorCardProps {
  creator: Creator;
  variant?: 'default' | 'compact';
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollow?: (creatorId: string) => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function CreatorCard({
  creator,
  variant = 'default',
  showFollowButton: _showFollowButton = true,
  isFollowing: _isFollowing = false,
  onFollow
}: CreatorCardProps) {
  const _handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFollow) {
      onFollow(creator.id);
    }
  };

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border-2 border-border/50",
        "transition-all duration-300 ease-in-out",
        "hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10",
        "hover:-translate-y-1",
        variant === 'compact' ? 'p-4' : 'p-6'
      )}
    >
      <div className="flex flex-col items-center text-center space-y-1">
        {/* Avatar with Verification Badge */}
        <div className="relative">
          <Avatar 
            className={cn(
              "border-[3px] transition-all duration-300",
              "border-border/50 group-hover:border-primary/70",
              "group-hover:scale-105",
              variant === 'compact' ? "h-20 w-20" : "h-24 w-24"
            )}
          >
            <AvatarImage src={creator.avatar} alt={creator.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground text-2xl font-bold">
              {creator.name[0]}
            </AvatarFallback>
          </Avatar>
          
          {/* Verification Badge */}
          {creator.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Creator Info */}
        <div className="w-full space-y-2">
          <h3 className={cn(
            "font-bold text-foreground transition-colors duration-300",
            "group-hover:text-primary",
            variant === 'compact' ? 'text-base' : 'text-lg'
          )}>
            {creator.name}
          </h3>
          
          <p className="text-sm text-muted-foreground font-medium">
            @{creator.username}
          </p>
        </div>

        {/* Statistics */}
        <div className="flex items-center justify-center gap-6 w-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {formatNumber(creator.followers)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {creator.contentCount} videos
            </span>
          </div>
        </div>

        {/* View Profile Button */}
        <Link 
          to={`/creator/${creator.username}`}
          className={cn(
            "w-full inline-flex items-center justify-center",
            "rounded-lg border-2 transition-all duration-300",
            "border-border/50 bg-background/50 text-foreground",
            "hover:border-primary hover:bg-primary/10 hover:text-primary",
            "hover:shadow-md hover:shadow-primary/20",
            "font-semibold text-sm",
            "px-4 py-2",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "active:scale-[0.98]"
          )}
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

