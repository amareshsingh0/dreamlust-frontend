import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Heart,
  Share2,
  Download,
  Flag,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ListPlus
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentCard } from '@/components/content/ContentCard';
import { lazy, Suspense } from 'react';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CommentSectionSkeleton } from '@/components/comments/CommentSectionSkeleton';

// Lazy load CommentSection for code splitting
const CommentSection = lazy(() => 
  import('@/components/comments/CommentSection').then(module => ({ 
    default: module.CommentSection 
  }))
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { mockContent } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  theme: string;
  language: string;
  region?: string | null;
  hideHistory: boolean;
  anonymousMode: boolean;
  defaultQuality: string;
  autoplay: boolean;
  notifications: {
    email?: Record<string, any>;
    push?: Record<string, any>;
    inApp?: Record<string, any>;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
}

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  // Get current user ID from localStorage (in a real app, use auth context)
  const currentUserId = localStorage.getItem('userId') || undefined;
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  const watchStartTimeRef = useRef<number | null>(null);
  const [watchDuration, setWatchDuration] = useState<number>(0);

  const content = mockContent.find(c => c.id === id);
  const [relatedContent, setRelatedContent] = useState<typeof mockContent>([]);
  const [similarContent, setSimilarContent] = useState<typeof mockContent>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Detect device type
  const detectDevice = (): 'mobile' | 'tablet' | 'desktop' => {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile';
    }
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  };

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.preferences.get<UserPreferences>();
        if (response.success && response.data) {
          setPreferences(response.data);
          setSelectedQuality(response.data.defaultQuality || 'auto');
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      }
    };
    fetchPreferences();
  }, []);

  // Fetch playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await api.playlists.get<Playlist[]>();
        if (response.success && response.data) {
          setPlaylists(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      }
    };
    fetchPlaylists();
  }, []);

  // Fetch similar content
  useEffect(() => {
    if (!id) return;
    
    const fetchSimilarContent = async () => {
      setLoadingSimilar(true);
      try {
        const response = await api.recommendations.getSimilar<typeof mockContent>(id, 8);
        if (response.success && response.data) {
          setSimilarContent(response.data);
        } else {
          // Fallback to mock data if API fails
          setSimilarContent(mockContent.filter(c => c.id !== id).slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to fetch similar content:', error);
        // Fallback to mock data
        setSimilarContent(mockContent.filter(c => c.id !== id).slice(0, 8));
      } finally {
        setLoadingSimilar(false);
      }
    };

    fetchSimilarContent();
  }, [id]);

  // Set related content (fallback)
  useEffect(() => {
    if (similarContent.length === 0 && !loadingSimilar) {
      setRelatedContent(mockContent.filter(c => c.id !== id).slice(0, 8));
    } else {
      setRelatedContent(similarContent);
    }
  }, [similarContent, loadingSimilar, id]);

  // Helper to parse duration string to seconds
  const parseDurationToSeconds = (duration: string): number => {
    // Parse formats like "5:30", "1:23:45", etc.
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Track view on mount
  useEffect(() => {
    if (id) {
      const trackView = async () => {
        try {
          await api.content.trackView(id, {});
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      };
      trackView();
      
      // Set watch start time
      watchStartTimeRef.current = Date.now();
    }
    
    // Cleanup: Track view event when component unmounts or content changes
    return () => {
      if (id && watchStartTimeRef.current && content) {
        const duration = Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
        const contentDuration = parseDurationToSeconds(content.duration);
        const completionRate = contentDuration > 0 ? Math.min(duration / contentDuration, 1) : 0;
        
        // Track detailed view event
        api.analytics.trackViewEvent({
          contentId: id,
          watchDuration: duration,
          completionRate,
          device: detectDevice(),
          region: preferences?.region || undefined,
        }).catch(error => {
          console.error('Failed to track view event:', error);
        });
      }
    };
  }, [id, content, preferences]);

  // Update watch duration periodically when playing
  useEffect(() => {
    if (!watchStartTimeRef.current || !isPlaying) return;
    
    const interval = setInterval(() => {
      if (watchStartTimeRef.current) {
        setWatchDuration(Math.floor((Date.now() - watchStartTimeRef.current) / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!id) return;
    try {
      const response = await api.playlists.addItem(playlistId, { contentId: id });
      if (response.success) {
        toast({
          title: 'Added to playlist',
          description: 'Content has been added to your playlist.',
        });
        setShowAddToPlaylist(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to add to playlist',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const response = await api.playlists.post<Playlist>({
        name: newPlaylistName,
        isPublic: newPlaylistPublic,
      });
      if (response.success && response.data) {
        setPlaylists([...playlists, response.data]);
        setNewPlaylistName('');
        setNewPlaylistPublic(false);
        // Add content to new playlist
        if (id) {
          await handleAddToPlaylist(response.data.id);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to create playlist',
        variant: 'destructive',
      });
    }
  };

  const handleSharePlaylist = (playlistId: string) => {
    const url = `${window.location.origin}/playlist/${playlistId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Playlist link has been copied to clipboard.',
    });
  };

  if (!content) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleLike = async () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    if (isDisliked) setIsDisliked(false);
    
    // Track interaction
    if (id) {
      try {
        await api.analytics.trackInteraction({
          contentId: id,
          type: newLikedState ? 'like' : 'skip', // Skip when unliking
        });
      } catch (error) {
        console.error('Failed to track like interaction:', error);
      }
    }
  };

  const handleDislike = async () => {
    const newDislikedState = !isDisliked;
    setIsDisliked(newDislikedState);
    if (isLiked) setIsLiked(false);
    
    // Track interaction
    if (id) {
      try {
        await api.analytics.trackInteraction({
          contentId: id,
          type: 'skip',
        });
      } catch (error) {
        console.error('Failed to track dislike interaction:', error);
      }
    }
  };

  const handleShare = async () => {
    if (id) {
      try {
        await api.analytics.trackInteraction({
          contentId: id,
          type: 'share',
        });
      } catch (error) {
        console.error('Failed to track share interaction:', error);
      }
    }
  };

  const handleSave = async () => {
    if (id) {
      try {
        await api.analytics.trackInteraction({
          contentId: id,
          type: 'save',
        });
      } catch (error) {
        console.error('Failed to track save interaction:', error);
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>{content.title} - DreamLust</title>
        <meta name="description" content={content.description || `Watch ${content.title} by ${content.creator.name}`} />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video Player */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden group" data-testid="video-player">
                <img 
                  src={content.thumbnail} 
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <button
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      if (!isPlaying && !watchStartTimeRef.current) {
                        // Start tracking when play begins
                        watchStartTimeRef.current = Date.now();
                      }
                    }}
                    className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors neon-glow"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 text-primary-foreground" />
                    ) : (
                      <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
                    )}
                  </button>
                </div>

                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-white/30 rounded-full mb-4 cursor-pointer">
                    <div className="h-full w-1/3 bg-primary rounded-full" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:text-primary"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <span className="text-white text-sm">0:00 / {content.duration}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                            <Settings className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => setSelectedQuality('auto')}
                            className={selectedQuality === 'auto' ? 'bg-muted' : ''}
                          >
                            Quality: Auto {selectedQuality === 'auto' && '✓'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {content.quality.map(q => (
                            <DropdownMenuItem 
                              key={q}
                              onClick={() => setSelectedQuality(q)}
                              className={selectedQuality === q ? 'bg-muted' : ''}
                            >
                              {q} {selectedQuality === q && '✓'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                        <Maximize className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {content.isPremium && (
                    <Badge className="bg-gradient-to-r from-primary to-accent border-0">Premium</Badge>
                  )}
                  {content.type === 'vr' && (
                    <Badge variant="secondary">VR</Badge>
                  )}
                  {content.quality.includes('4K') && (
                    <Badge variant="secondary">4K</Badge>
                  )}
                </div>
              </div>

              {/* Title & Actions */}
              <div>
                <h1 className="font-display text-2xl font-bold mb-2">{content.title}</h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{content.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Creator */}
                  <Link to={`/creator/${content.creator.username}`} className="flex items-center gap-3 group">
                    <Avatar className="h-12 w-12 border-2 border-primary/50">
                      <AvatarImage src={content.creator.avatar} alt={`${content.creator.name} avatar`} />
                      <AvatarFallback>{content.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {content.creator.name}
                        </span>
                        {content.creator.isVerified && (
                          <Zap className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(content.creator.followers / 1000).toFixed(1)}K followers
                      </p>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={isLiked ? 'default' : 'secondary'}
                      size="sm"
                      className="gap-2"
                      onClick={handleLike}
                      data-testid="like-button"
                    >
                      <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
                      {(content.likes + (isLiked ? 1 : 0)).toLocaleString()}
                    </Button>
                    <Button
                      variant={isDisliked ? 'destructive' : 'secondary'}
                      size="sm"
                      onClick={handleDislike}
                    >
                      <ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Dialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="gap-2"
                          onClick={handleSave}
                        >
                          <Plus className="h-4 w-4" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add to Playlist</DialogTitle>
                          <DialogDescription>
                            Choose a playlist or create a new one
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Existing playlists */}
                          {playlists.length > 0 && (
                            <div className="space-y-2">
                              <Label>Your Playlists</Label>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {playlists.map(playlist => (
                                  <div
                                    key={playlist.id}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => handleAddToPlaylist(playlist.id)}
                                  >
                                    <div>
                                      <p className="font-medium">{playlist.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {playlist.itemCount} items • {playlist.isPublic ? 'Public' : 'Private'}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSharePlaylist(playlist.id);
                                      }}
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Create new playlist */}
                          <div className="space-y-4">
                            <Label>Create New Playlist</Label>
                            <div className="space-y-2">
                              <Input
                                id="playlist-name"
                                name="playlist-name"
                                placeholder="Playlist name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                              />
                              <div className="flex items-center justify-between">
                                <Label htmlFor="playlist-public" className="text-sm font-normal">
                                  Make playlist public
                                </Label>
                                <Switch
                                  id="playlist-public"
                                  name="playlist-public"
                                  checked={newPlaylistPublic}
                                  onCheckedChange={setNewPlaylistPublic}
                                />
                              </div>
                              <Button
                                onClick={handleCreatePlaylist}
                                disabled={!newPlaylistName.trim()}
                                className="w-full"
                              >
                                <ListPlus className="h-4 w-4 mr-2" />
                                Create and Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Clock className="h-4 w-4 mr-2" />
                          Watch Later
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-foreground/80 mb-4">
                  {content.description || 'No description available.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map(tag => (
                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Comments */}
              {id && (
                <Suspense fallback={<CommentSectionSkeleton />}>
                  <CommentSection
                    contentId={id}
                    creatorId={content.creator.id}
                    currentUserId={currentUserId}
                  />
                </Suspense>
              )}
            </div>

            {/* Sidebar - Related */}
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">More like this</h2>
              {loadingSimilar ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="flex gap-3 p-3 rounded-xl bg-muted/30">
                        <div className="w-40 h-24 rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : relatedContent.length > 0 ? (
                <div className="space-y-2">
                  {relatedContent.map(item => (
                    <Suspense key={item.id} fallback={<ContentCardSkeleton variant="horizontal" />}>
                      <ContentCard content={item} variant="horizontal" />
                    </Suspense>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No similar content found.</p>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
