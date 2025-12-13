import { Link } from 'react-router-dom';
import { UserPlus, Users, Video, Zap, Check } from 'lucide-react';
import { Creator } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  showFollowButton = true,
  isFollowing = false,
  onFollow
}: CreatorCardProps) {
  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFollow) {
      onFollow(creator.id);
    }
  };

  return (
    <Link 
      to={`/creator/${creator.username}`}
      className={cn(
        "group block rounded-xl overflow-hidden transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        variant === 'compact' ? 'p-3' : 'p-4'
      )}
    >
      <div className="space-y-4">
        {/* Header with avatar and follow button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className={cn(
              "border-2 transition-colors",
              variant === 'compact' ? "h-12 w-12" : "h-16 w-16",
              "border-transparent group-hover:border-primary/50"
            )}>
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {creator.name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold line-clamp-1 group-hover:text-primary transition-colors",
                  variant === 'compact' ? 'text-sm' : 'text-base'
                )}>
                  {creator.name}
                </h3>
                {creator.isVerified && (
                  <Badge variant="default" className="h-4 px-1.5 text-xs">
                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                @{creator.username}
              </p>
            </div>
          </div>

          {showFollowButton && (
            <Button
              variant={isFollowing ? "secondary" : "default"}
              size={variant === 'compact' ? "sm" : "default"}
              className={cn(
                "flex-shrink-0 transition-all",
                isFollowing && "bg-primary/10 hover:bg-primary/20"
              )}
              onClick={handleFollow}
            >
              {isFollowing ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>

        {/* Bio */}
        {creator.bio && variant !== 'compact' && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {creator.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Video className="h-4 w-4" />
            <span className="font-medium">{formatNumber(creator.contentCount)}</span>
            <span className="text-xs">videos</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-medium">{formatNumber(creator.followers)}</span>
            <span className="text-xs">followers</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

