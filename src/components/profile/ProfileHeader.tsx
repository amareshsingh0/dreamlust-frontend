import { useState } from 'react';
import { Camera, Edit2, Twitter, Instagram, Globe, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  isOwnProfile?: boolean;
  isCreator?: boolean;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  stats?: {
    followers?: number;
    following?: number;
    uploads?: number;
    watched?: number;
    playlists?: number;
  };
  memberSince?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
  onEdit?: () => void;
}

export function ProfileHeader({
  isOwnProfile = false,
  isCreator = false,
  username,
  displayName,
  avatar,
  banner,
  bio,
  socialLinks,
  stats,
  memberSince,
  isFollowing = false,
  onFollow,
  onEdit,
}: ProfileHeaderProps) {
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  return (
    <div className="relative mb-8">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 overflow-hidden rounded-lg">
        {banner ? (
          <img 
            src={banner} 
            alt={`${displayName}'s banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 gap-2"
            onClick={() => setIsEditingBanner(true)}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Banner</span>
          </Button>
        )}

        {/* Avatar Overlay */}
        <div className="absolute -bottom-12 left-6 md:left-8">
          <div className="relative group">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-background shadow-xl ring-2 ring-primary/20 overflow-hidden">
              <Avatar className="h-full w-full rounded-full">
                <AvatarImage src={avatar} alt={displayName} className="object-cover" />
                <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold rounded-full h-full w-full flex items-center justify-center">
                  {displayName[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            {isOwnProfile && (
              <Button
                variant="default"
                size="icon"
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full border-2 border-background shadow-lg hover:scale-110 transition-transform"
                onClick={() => setIsEditingAvatar(true)}
                title="Edit Avatar"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-16 md:mt-20 px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl md:text-4xl font-bold">{displayName}</h1>
              {isCreator && (
                <Badge variant="default" className="gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-accent border-0">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-semibold">Creator</span>
                </Badge>
              )}
            </div>
            
            <p className="text-muted-foreground mb-2">
              @{username}
              {memberSince && ` • Member since ${memberSince}`}
            </p>

            {bio && (
              <p className="text-sm md:text-base text-foreground/80 mb-4 max-w-2xl">
                {bio}
              </p>
            )}

            {/* Social Links */}
            {socialLinks && (socialLinks.twitter || socialLinks.instagram || socialLinks.website) && (
              <div className="flex items-center gap-3 mb-4">
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="flex flex-wrap gap-6 md:gap-8 mt-4">
                {stats.followers !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.followers.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Followers</span>
                  </div>
                )}
                {stats.following !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.following.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Following</span>
                  </div>
                )}
                {stats.uploads !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.uploads.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Uploads</span>
                  </div>
                )}
                {stats.watched !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.watched.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Watched</span>
                  </div>
                )}
                {stats.playlists !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.playlists.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Playlists</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Button onClick={onEdit} className="gap-2">
                <Edit2 className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Button>
            ) : (
              <Button
                variant={isFollowing ? 'secondary' : 'default'}
                onClick={onFollow}
                className="gap-2"
              >
                {isFollowing ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Follow</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

