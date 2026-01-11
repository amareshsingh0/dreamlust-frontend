import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { createSimpleBlurPlaceholder } from '@/lib/imageUtils';
import { api } from '@/lib/api';
import type { Content } from '@/types';

// Helper to format views
function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

// Helper to format duration
function formatDuration(duration: number | string | undefined): string {
  if (!duration) return '';
  if (typeof duration === 'string') return duration;

  const hours = Math.floor(duration / 3600);
  const mins = Math.floor((duration % 3600) / 60);
  const secs = duration % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const HeroSection = React.memo(function HeroSection() {
  const [featuredContent, setFeaturedContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        let content: Content | null = null;

        // Try multiple endpoints to find content
        const endpoints = [
          () => api.recommendations.getTrendingNow<Content[]>(5),
          () => api.recommendations.getForYou<Content[]>(5),
          () => api.recommendations.getSmartHomepage<{ sections: Array<{ items: Content[] }> }>(5),
          () => api.search.post<{ results: Content[] }>({ query: '', sort: 'views', limit: 5 }),
        ];

        for (const fetchEndpoint of endpoints) {
          try {
            const response = await fetchEndpoint();
            if (response.success && response.data) {
              // Handle different response formats
              let items: Content[] = [];
              if (Array.isArray(response.data)) {
                items = response.data;
              } else if ((response.data as any).results) {
                items = (response.data as any).results;
              } else if ((response.data as any).sections) {
                // Smart homepage format
                const sections = (response.data as any).sections;
                for (const section of sections) {
                  if (section.items && section.items.length > 0) {
                    items = section.items;
                    break;
                  }
                }
              }

              if (items.length > 0) {
                content = items[0];
                break;
              }
            }
          } catch {
            // Try next endpoint
            continue;
          }
        }

        if (content) {
          // Normalize creator data
          const normalizedContent: Content = {
            ...content,
            creator: {
              id: content.creator?.id || '',
              name: content.creator?.name || (content.creator as any)?.displayName || 'Creator',
              username: content.creator?.username || (content.creator as any)?.handle || '',
              avatar: content.creator?.avatar || '',
              bio: content.creator?.bio || '',
              followers: content.creator?.followers || (content.creator as any)?.followerCount || 0,
              views: content.creator?.views || (content.creator as any)?.totalViews || 0,
              contentCount: content.creator?.contentCount || 0,
              isVerified: content.creator?.isVerified || false,
            },
          };
          setFeaturedContent(normalizedContent);
        }
      } catch (error) {
        console.error('Failed to fetch featured content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedContent();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <section className="relative h-[400px] sm:h-[500px] md:h-[550px] lg:h-[600px] overflow-hidden bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </section>
    );
  }

  // Don't show hero if no real content
  if (!featuredContent) {
    return null;
  }

  const creatorName = featuredContent.creator?.name || (featuredContent.creator as any)?.displayName || 'Creator';
  const creatorUsername = featuredContent.creator?.username || (featuredContent.creator as any)?.handle || '';
  const followers = featuredContent.creator?.followers || (featuredContent.creator as any)?.followerCount || 0;
  const viewCount = featuredContent.views || (featuredContent as any).viewCount || 0;
  const quality = featuredContent.quality || [];

  return (
    <section className="relative h-[400px] sm:h-[500px] md:h-[550px] lg:h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <OptimizedImage
          src={featuredContent.thumbnail || ''}
          alt={featuredContent.title}
          blurDataURL={(featuredContent as any).thumbnailBlur || createSimpleBlurPlaceholder()}
          className="w-full h-full"
          width={1920}
          height={1080}
          objectFit="cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-3 sm:px-4 flex items-center">
        <div className="max-w-2xl space-y-3 sm:space-y-4 md:space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">Featured Today</span>
          </div>

          {/* Title - max 2 lines with ellipsis */}
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight line-clamp-2">
            {featuredContent.title}
          </h1>

          {/* Description - truncated for better layout */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl line-clamp-2">
            {featuredContent.description
              ? (featuredContent.description.length > 150
                  ? featuredContent.description.substring(0, 150) + '...'
                  : featuredContent.description)
              : 'Experience the most immersive content from top creators around the world.'}
          </p>

          {/* Creator info */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to={`/creator/${creatorUsername}`}>
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/50">
                <AvatarImage
                  src={featuredContent.creator?.avatar || ''}
                  alt={creatorName}
                  width={40}
                  height={40}
                />
                <AvatarFallback>{creatorName[0]}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link to={`/creator/${creatorUsername}`} className="font-medium text-sm sm:text-base hover:text-primary transition-colors">
                {creatorName}
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {followers.toLocaleString()} followers
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Button size="default" className="gap-1.5 sm:gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4" asChild>
              <Link to={`/watch/${featuredContent.id}`}>
                <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                Watch Now
              </Link>
            </Button>
            <Button size="default" variant="secondary" className="gap-1.5 sm:gap-2 text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4" asChild>
              <Link to="/trending">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Explore </span>Trending
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground">
            <span>{formatViews(viewCount)} views</span>
            {quality.length > 0 && (
              <>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline">{quality.join(' • ')}</span>
              </>
            )}
            {featuredContent.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(featuredContent.duration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
    </section>
  );
});
