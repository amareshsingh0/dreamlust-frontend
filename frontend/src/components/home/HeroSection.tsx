import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { createSimpleBlurPlaceholder } from '@/lib/imageUtils';
import { mockContent } from '@/data/mockData';

export const HeroSection = React.memo(function HeroSection() {
  const featuredContent = mockContent[0];

  return (
    <section className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <OptimizedImage
          src={featuredContent.thumbnail || ''}
          alt={featuredContent.title}
          blurDataURL={(featuredContent as any).thumbnailBlur || createSimpleBlurPlaceholder()}
          className="w-full h-full"
          objectFit="cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-center">
        <div className="max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Featured Today</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
            {featuredContent.title}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-xl">
            {featuredContent.description || 'Experience the most immersive content from top creators around the world.'}
          </p>

          {/* Creator info */}
          <div className="flex items-center gap-3">
            <img 
              src={featuredContent.creator.avatar}
              alt={featuredContent.creator.name}
              className="w-10 h-10 rounded-full border-2 border-primary/50"
            />
            <div>
              <p className="font-medium">{featuredContent.creator.name}</p>
              <p className="text-sm text-muted-foreground">
                {featuredContent.creator.followers.toLocaleString()} followers
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90" asChild>
              <Link to={`/watch/${featuredContent.id}`}>
                <Play className="h-5 w-5" fill="currentColor" />
                Watch Now
              </Link>
            </Button>
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link to="/trending">
                <TrendingUp className="h-5 w-5" />
                Explore Trending
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{(featuredContent.views / 1000000).toFixed(1)}M views</span>
            <span>•</span>
            <span>{featuredContent.quality.join(' • ')}</span>
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
}
