import { useNavigate } from 'react-router-dom';
import { Play, Eye, Heart, Clock, Zap, Crown, Image as ImageIcon, Radio, Music, Camera, Film, Gamepad2, Palette, Dumbbell, ChefHat, Plane, BookOpen, Tag } from 'lucide-react';
import { Content } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { createSimpleBlurPlaceholder } from '@/lib/imageUtils';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
// Tooltip import removed - not currently used

// Category icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  music: Music,
  photo: Camera,
  photography: Camera,
  video: Film,
  gaming: Gamepad2,
  art: Palette,
  fitness: Dumbbell,
  cooking: ChefHat,
  food: ChefHat,
  travel: Plane,
  education: BookOpen,
  vr: Gamepad2,
};

function getCategoryIcon(categoryName: string): React.ElementType {
  const lowerName = categoryName.toLowerCase();
  return categoryIcons[lowerName] || Tag;
}

interface ContentCardProps {
  content: Content;
  variant?: 'default' | 'compact' | 'horizontal';
  className?: string;
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

function formatDuration(duration: number | string | undefined): string {
  if (!duration) return '';

  // If duration is already a formatted string (e.g., "9:57" or "1:23:45"), return it
  if (typeof duration === 'string') {
    // Check if it's already formatted (contains colon)
    if (duration.includes(':')) {
      return duration;
    }
    // Try to parse as number
    const parsed = parseInt(duration);
    if (isNaN(parsed) || parsed <= 0) return '';
    duration = parsed;
  }

  const seconds = duration as number;
  if (seconds <= 0) return '';

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getQualityBadge(content: Content): string | null {
  const quality = content.quality || (content as any).resolution;
  if (!quality) return null;

  const qualityStr = Array.isArray(quality) ? quality.join(' ') : String(quality);
  const upperQuality = qualityStr.toUpperCase();

  if (upperQuality.includes('8K')) return '8K';
  if (upperQuality.includes('4K') || upperQuality.includes('2160')) return '4K';
  return null;
}

function getPhotoCount(content: Content): number | null {
  if (content.type !== 'photo' && content.type !== 'gallery') return null;
  return (content as any).photoCount || (content as any).imageCount || (content as any).photos?.length || null;
}

function getPrimaryCategory(content: Content): string | null {
  // UUID regex pattern to filter out invalid category names
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Prioritize single category string (properly transformed by backend)
  // But skip if it's a UUID or 'Uncategorized'
  if (content.category && content.category !== 'Uncategorized' && !uuidPattern.test(content.category)) {
    return content.category;
  }
  // Check for categories array (from backend with nested category object)
  if (content.categories && content.categories.length > 0) {
    const cat = content.categories[0];
    // Handle both { name: string } and { category: { name: string } } structures
    const categoryName = (cat as any)?.category?.name || cat?.name;
    // Skip if the name looks like a UUID
    if (categoryName && !uuidPattern.test(categoryName)) {
      return categoryName;
    }
  }
  // Check tags for category-like values
  if (content.tags && content.tags.length > 0) {
    const categoryTags = ['music', 'video', 'photo', 'gaming', 'art', 'fitness', 'cooking', 'travel', 'education', 'vr'];
    const found = content.tags.find(tag => categoryTags.includes(tag.toLowerCase()));
    return found || null;
  }
  return null;
}

export const ContentCard = React.memo(function ContentCard({ content, variant = 'default', className }: ContentCardProps) {
  const isLive = content.type === 'live' || content.isLive;
  const isVR = content.type === 'vr';
  const isPhoto = content.type === 'photo' || content.type === 'gallery';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState((content as any).isLiked || false);
  // Handle both field name variations from backend (likeCount vs likes, viewCount vs views)
  const [likeCount, setLikeCount] = useState(content.likes || (content as any).likeCount || 0);
  const [liking, setLiking] = useState(false);

  // Helper to get creator fields that may have different names from backend
  const creatorName = content.creator?.name || (content.creator as any)?.displayName || 'Creator';
  const creatorUsername = content.creator?.username || (content.creator as any)?.handle || '';
  const viewCount = content.views || (content as any).viewCount || 0;
  const qualityBadge = getQualityBadge(content);
  const photoCount = getPhotoCount(content);
  const durationFormatted = formatDuration(content.duration);
  const primaryCategory = getPrimaryCategory(content);
  const CategoryIcon = primaryCategory ? getCategoryIcon(primaryCategory) : null;

  useEffect(() => {
    // Check if content is liked when component mounts
    if (user && content.id) {
      // This will be set from the API response
      setIsLiked((content as any).isLiked || false);
    }
  }, [user, content]);

  const _handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to like content");
      navigate("/auth");
      return;
    }

    if (liking) return;

    setLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount((prev: number) => isLiked ? prev - 1 : prev + 1);

    try {
      const response = await api.content.like(content.id);
      if (response.success) {
        const data = response.data as { liked?: boolean } | undefined;
        setIsLiked(data?.liked ?? !previousLiked);
        setLikeCount(data?.liked ? previousCount + 1 : previousCount - 1);
      } else {
        // Revert on error
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
        toast.error(response.error?.message || "Failed to like content");
      }
    } catch (error: any) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to like content");
    } finally {
      setLiking(false);
    }
  };
  
  if (variant === 'horizontal') {
    return (
      <div
        onClick={() => navigate(`/watch/${content.id}`)}
        className="flex gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all duration-300 group cursor-pointer"
      >
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <OptimizedImage
            src={content.thumbnail || ''}
            alt={content.title}
            blurDataURL={(content as any).thumbnailBlur || createSimpleBlurPlaceholder()}
            className="group-hover:scale-105 transition-transform duration-500"
            width={160}
            height={90}
            objectFit="cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

          {/* Top-left badges */}
          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
            {content.isPremium && (
              <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 border-0 text-white text-[10px] px-1.5 py-0">
                <Crown className="h-2.5 w-2.5 mr-0.5" />
                Premium
              </Badge>
            )}
            {qualityBadge && !content.isPremium && (
              <Badge className="bg-background/90 text-foreground text-[10px] px-1.5 py-0 font-bold">
                {qualityBadge}
              </Badge>
            )}
          </div>

          {/* Top-right: VR badge and Category */}
          <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
            {isVR && (
              <Badge className="bg-background/90 text-foreground text-[10px] px-1.5 py-0 font-bold">
                VR
              </Badge>
            )}
            {primaryCategory && !isVR && CategoryIcon && (
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <CategoryIcon className="h-2.5 w-2.5" />
                {primaryCategory}
              </Badge>
            )}
          </div>

          {/* Bottom-right badge */}
          {(isLive || (isPhoto && photoCount) || durationFormatted) && (
            <span className={cn(
              "absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
              isLive
                ? "bg-red-500 text-white flex items-center gap-1"
                : "bg-background/90 text-foreground"
            )}>
              {isLive ? (
                <>
                  <Radio className="h-2.5 w-2.5 animate-pulse" />
                  LIVE
                </>
              ) : isPhoto && photoCount ? (
                `${photoCount} photos`
              ) : (
                durationFormatted
              )}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {content.title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/creator/${creatorUsername}`);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 flex items-center gap-1 text-left"
          >
            <span>{creatorName}</span>
            {content.creator?.isVerified && (
              <Zap className="h-3 w-3 text-primary fill-primary" />
            )}
          </button>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatViews(viewCount)} views</span>
            <span>•</span>
            <span>{formatDate(content.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => navigate(`/watch/${content.id}`)}
      data-testid="video-card"
      className={cn(
        "group block rounded-xl overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:scale-[1.02] hover:shadow-lg",
        variant === 'compact' ? 'space-y-2' : 'space-y-3',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
        <OptimizedImage
          src={content.thumbnail || ''}
          alt={content.title}
          blurDataURL={(content as any).thumbnailBlur || createSimpleBlurPlaceholder()}
          className="group-hover:scale-110 transition-transform duration-500"
          width={640}
          height={360}
          objectFit="cover"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action buttons on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Play button */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Play className="h-6 w-6 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Top-left badges: Premium only (no quality badge with Premium) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {content.isPremium && (
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 border-0 text-white shadow-lg">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
          {qualityBadge && !content.isPremium && (
            <Badge className="bg-background/90 backdrop-blur-sm text-foreground font-bold shadow-md px-1.5 py-0.5 text-[10px]">
              {qualityBadge}
            </Badge>
          )}
        </div>

        {/* Top-right badges: VR indicator and Category */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {isVR && (
            <Badge className="bg-background/90 backdrop-blur-sm text-foreground font-bold shadow-md px-1.5 py-0.5 text-[10px]">
              VR
            </Badge>
          )}
          {primaryCategory && !isVR && CategoryIcon && (
            <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-md px-2 py-0.5 text-[10px] flex items-center gap-1">
              <CategoryIcon className="h-3 w-3" />
              {primaryCategory}
            </Badge>
          )}
        </div>

        {/* Bottom-right badge: Duration / Photo count / LIVE */}
        {(isLive || (isPhoto && photoCount) || durationFormatted) && (
          <span className={cn(
            "absolute bottom-2 right-2 px-2.5 py-1 rounded-md text-xs font-semibold shadow-md",
            isLive
              ? "bg-red-500 text-white flex items-center gap-1.5"
              : "bg-background/90 backdrop-blur-sm text-foreground"
          )}>
            {isLive ? (
              <>
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE
              </>
            ) : isPhoto && photoCount ? (
              <>
                <ImageIcon className="h-3 w-3 inline mr-1" />
                {photoCount} photos
              </>
            ) : (
              durationFormatted
            )}
          </span>
        )}
      </div>

      {/* Content info */}
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/50 transition-colors">
          <AvatarImage src={content.creator?.avatar} alt={`${creatorName} avatar`} />
          <AvatarFallback>{creatorName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium line-clamp-2 group-hover:text-primary transition-colors",
            variant === 'compact' ? 'text-sm' : 'text-base'
          )}>
            {content.title}
          </div>

          {content.creator && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/creator/${creatorUsername}`);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 flex items-center gap-1 text-left"
            >
              <span>{creatorName}</span>
              {content.creator.isVerified && (
                <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
              )}
            </button>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className={cn("h-3 w-3", isLiked && "fill-current text-destructive")} />
              {formatViews(likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(content.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  return (
    prevProps.content.id === nextProps.content.id &&
    prevProps.content.likes === nextProps.content.likes &&
    prevProps.variant === nextProps.variant &&
    prevProps.className === nextProps.className
  );
});
