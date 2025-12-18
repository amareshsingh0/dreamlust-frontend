import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { createSimpleBlurPlaceholder } from '@/lib/imageUtils';
import { mockContent } from '@/data/mockData';

export const HeroSection = React.memo(function HeroSection() {
  const featuredContent = mockContent[0];

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

          {/* Title */}
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-tight">
            {featuredContent.title}
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl line-clamp-2 sm:line-clamp-none">
            {featuredContent.description || 'Experience the most immersive content from top creators around the world.'}
          </p>

          {/* Creator info */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/50">
              <AvatarImage
                src={featuredContent.creator.avatar}
                alt={featuredContent.creator.name}
                width={40}
                height={40}
              />
              <AvatarFallback>{featuredContent.creator.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm sm:text-base">{featuredContent.creator.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {featuredContent.creator.followers.toLocaleString()} followers
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
            <span>{(featuredContent.views / 1000000).toFixed(1)}M views</span>
            <span className="hidden xs:inline">•</span>
            <span className="hidden xs:inline">{featuredContent.quality.join(' • ')}</span>
            <span>•</span>
            <span>{featuredContent.duration}</span>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
    </section>
  );
});
