import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Zap, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialLinks } from './SocialLinks';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  banner?: string;
  bio?: string;
  followers: number;
  views: number;
  contentCount: number;
  isVerified?: boolean;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

interface CreatorHeaderProps {
  creator: Creator;
  isFollowing: boolean;
  onFollow: () => void;
  onTip: () => void;
  onShare?: () => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function CreatorHeader({
  creator,
  isFollowing,
  onFollow,
  onTip,
  onShare,
}: CreatorHeaderProps) {
  return (
    <>
      {/* Banner with Avatar */}
      <div className="relative">
        <img
          src={creator.banner || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200'}
          alt={`${creator.name} banner`}
          className="h-48 w-full object-cover"
        />
        <div className="absolute -bottom-12 left-8">
          <Avatar className="h-24 w-24 rounded-full border-4 border-background shadow-xl">
            <AvatarImage src={creator.avatar} alt={creator.name} />
            <AvatarFallback className="text-2xl rounded-full">
              {creator.name[0]}
            </AvatarFallback>
          </Avatar>
          {creator.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-4 border-background">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Header Content */}
      <div className="mt-16 px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl font-bold">{creator.name}</h1>
              {creator.isVerified && (
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Verified
                </span>
              )}
            </div>
            {creator.bio && (
              <p className="text-muted-foreground mb-4 max-w-2xl">{creator.bio}</p>
            )}

            {/* Stats */}
            <div className="flex gap-4 mt-4">
              <Stat label="Followers" value={formatNumber(creator.followers)} />
              <Stat label="Videos" value={formatNumber(creator.contentCount)} />
              <Stat label="Total Views" value={formatNumber(creator.views)} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              className={cn(
                "gap-2",
                isFollowing
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-gradient-to-r from-primary to-accent"
              )}
              onClick={onFollow}
            >
              {isFollowing ? (
                <>
                  <Users className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onTip} className="gap-2">
              <Zap className="h-4 w-4" />
              Tip Creator
            </Button>
            {onShare && (
              <Button variant="secondary" size="icon" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Social Links */}
        {creator.socialLinks && (
          <div className="mt-4">
            <SocialLinks links={creator.socialLinks} />
          </div>
        )}
      </div>
    </>
  );
}

