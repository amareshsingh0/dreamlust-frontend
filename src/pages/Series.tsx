/**
 * Series Page
 * Displays series with seasons, episodes, and auto-play next episode feature
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Play, Clock, Users, CheckCircle2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn as _cn } from '@/lib/utils';
import { NextEpisodeOverlay } from '@/components/series/NextEpisodeOverlay';

interface Series {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  followers: number;
  totalEpisodes: number;
  status: string;
  isFollowing: boolean;
  seasons: Season[];
  createdAt: string;
}

interface Season {
  id: string;
  seasonNumber: number;
  title?: string;
  description?: string;
  coverImage?: string;
  releaseDate?: string;
  episodeCount: number;
  episodes?: Episode[];
}

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: number;
  releaseDate?: string;
  isPublished: boolean;
  content: {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    views: number;
    likes: number;
    publishedAt?: string;
  };
  watched: boolean;
  progress: number;
}

export default function SeriesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null);
  const [countdown, setCountdown] = useState(10);

  // Load series data
  useEffect(() => {
    if (!id) return;

    const loadSeries = async () => {
      setLoading(true);
      try {
        const response = await api.series.getById<Series>(id);
        if (response.success && response.data) {
          setSeries(response.data);
          setIsFollowing(response.data.isFollowing);
          
          // Set active season to first season with episodes
          const firstSeasonWithEpisodes = response.data.seasons.find(
            s => s.episodes && s.episodes.length > 0
          );
          if (firstSeasonWithEpisodes) {
            setActiveSeason(firstSeasonWithEpisodes.seasonNumber);
          }
        }
      } catch (error) {
        console.error('Failed to load series:', error);
        toast({
          title: 'Error',
          description: 'Failed to load series',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, [id, toast]);

  const handleFollow = async () => {
    if (!id || !user) {
      navigate('/auth');
      return;
    }

    setFollowing(true);
    try {
      if (isFollowing) {
        const response = await api.series.unfollow(id);
        if (response.success) {
          setIsFollowing(false);
          setSeries(prev => prev ? { ...prev, followers: prev.followers - 1, isFollowing: false } : null);
        }
      } else {
        const response = await api.series.follow(id);
        if (response.success) {
          setIsFollowing(true);
          setSeries(prev => prev ? { ...prev, followers: prev.followers + 1, isFollowing: true } : null);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setFollowing(false);
    }
  };

  const playEpisode = (episode: Episode) => {
    navigate(`/watch/${episode.content.id}`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const _formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const _getProgress = (episode: Episode): number => {
    if (!episode.duration || episode.duration === 0) return 0;
    return (episode.progress / episode.duration) * 100;
  };

  const getNextEpisode = (currentEpisodeId: string): Episode | null => {
    if (!series) return null;

    for (const season of series.seasons) {
      if (!season.episodes) continue;
      
      const currentIndex = season.episodes.findIndex(e => e.content.id === currentEpisodeId);
      if (currentIndex !== -1 && currentIndex < season.episodes.length - 1) {
        return season.episodes[currentIndex + 1];
      }
      
      // Check next season
      const nextSeason = series.seasons.find(s => s.seasonNumber === season.seasonNumber + 1);
      if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
        return nextSeason.episodes[0];
      }
    }
    
    return null;
  };

  // Auto-play next episode countdown
  useEffect(() => {
    if (!showNextEpisode || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (nextEpisode) {
            playEpisode(nextEpisode);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showNextEpisode, countdown, nextEpisode]);

  // Listen for video end event to show next episode
  useEffect(() => {
    const handleVideoEnd = (e: CustomEvent) => {
      const currentEpisodeId = e.detail?.contentId;
      if (currentEpisodeId && series) {
        const next = getNextEpisode(currentEpisodeId);
        if (next && next.isPublished) {
          setNextEpisode(next);
          setShowNextEpisode(true);
          setCountdown(10);
        }
      }
    };

    window.addEventListener('video-ended' as any, handleVideoEnd);
    return () => window.removeEventListener('video-ended' as any, handleVideoEnd);
  }, [series]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!series) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Series not found</h1>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const currentSeason = series.seasons.find(s => s.seasonNumber === activeSeason);
  const _episodes = currentSeason?.episodes || [];

  return (
    <>
      <Helmet>
        <title>{series.title} - PassionFantasia</title>
        <meta name="description" content={series.description || `Watch ${series.title}`} />
      </Helmet>

      <Layout>
        <div className="space-y-6 sm:space-y-8 pb-8 sm:pb-12">
          {/* Series Header */}
          <div className="relative">
            {/* Cover Image */}
            {series.coverImage && (
              <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
                <OptimizedImage
                  src={series.coverImage}
                  alt={series.title}
                  className="w-full h-full object-cover"
                  width={1920}
                  height={600}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div>
            )}

            {/* Series Info */}
            <div className="container mx-auto px-4 lg:px-8 -mt-20 sm:-mt-32 relative z-10">
              <div className="bg-card rounded-lg border border-border p-6 sm:p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Cover Image (if no header image) */}
                  {!series.coverImage && (
                    <div className="w-32 h-48 sm:w-40 sm:h-60 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <OptimizedImage
                        src={series.coverImage || ''}
                        alt={series.title}
                        className="w-full h-full object-cover"
                        width={160}
                        height={240}
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-bold mb-2">{series.title}</h1>
                      {series.description && (
                        <p className="text-muted-foreground">{series.description}</p>
                      )}
                    </div>

                    {/* Creator Info */}
                    <div className="flex items-center gap-3">
                      <Link to={`/creator/${series.creator.username}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={series.creator.avatar} alt={series.creator.name} />
                          <AvatarFallback>{series.creator.name[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link to={`/creator/${series.creator.username}`} className="font-medium hover:text-primary">
                          {series.creator.name}
                        </Link>
                        {series.creator.isVerified && (
                          <Badge variant="secondary" className="ml-2">Verified</Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{formatNumber(series.followers)} followers</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Play className="h-4 w-4" />
                        <span>{series.totalEpisodes} episodes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{series.seasons.length} seasons</span>
                      </div>
                      {series.status && (
                        <Badge variant={series.status === 'completed' ? 'default' : 'secondary'}>
                          {series.status}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleFollow}
                        disabled={following}
                        variant={isFollowing ? 'outline' : 'default'}
                      >
                        {isFollowing ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Follow Series
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seasons and Episodes */}
          <div className="container mx-auto px-4 lg:px-8">
            {series.seasons.length > 0 ? (
              <Tabs value={activeSeason.toString()} onValueChange={(v) => setActiveSeason(parseInt(v))}>
                <TabsList className="mb-6">
                  {series.seasons.map((season) => (
                    <TabsTrigger key={season.id} value={season.seasonNumber.toString()}>
                      {season.title || `Season ${season.seasonNumber}`}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {series.seasons.map((season) => (
                  <TabsContent key={season.id} value={season.seasonNumber.toString()}>
                    {season.episodes && season.episodes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {season.episodes.map((episode) => (
                          <EpisodeCard
                            key={episode.id}
                            episode={episode}
                            onClick={() => playEpisode(episode)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No episodes in this season yet
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No seasons available yet
              </div>
            )}
          </div>
        </div>

        {/* Next Episode Overlay */}
        {showNextEpisode && nextEpisode && (
          <NextEpisodeOverlay
            episode={nextEpisode}
            countdown={countdown}
            onPlay={() => {
              setShowNextEpisode(false);
              playEpisode(nextEpisode);
            }}
            onCancel={() => setShowNextEpisode(false)}
          />
        )}
      </Layout>
    </>
  );
}

interface EpisodeCardProps {
  episode: Episode;
  onClick: () => void;
}

function EpisodeCard({ episode, onClick }: EpisodeCardProps) {
  const progress = episode.duration ? (episode.progress / episode.duration) * 100 : 0;
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="group cursor-pointer space-y-2"
      onClick={onClick}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <OptimizedImage
          src={episode.content.thumbnail || ''}
          alt={episode.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          width={320}
          height={180}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-6 w-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Progress bar */}
        {episode.watched && progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/50">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Watched badge */}
        {episode.watched && progress >= 90 && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="h-5 w-5 text-primary fill-primary" />
          </div>
        )}

        {/* Episode number */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary">E{episode.episodeNumber}</Badge>
        </div>

        {/* Duration */}
        {episode.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(episode.duration)}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {episode.title}
        </h3>
        {episode.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {episode.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{episode.content.views.toLocaleString()} views</span>
          {episode.releaseDate && (
            <span>{new Date(episode.releaseDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

