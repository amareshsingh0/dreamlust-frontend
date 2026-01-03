import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Share2,
  Download,
  Flag,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ListPlus,
  Loader2,
  Trash2,
  AlertTriangle,
  Edit,
  Crown
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
import { TagBadge } from '@/components/content/TagBadge';
import { ExpandableDescription } from '@/components/content/ExpandableDescription';

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { mockContent } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MultiAnglePlayer } from '@/components/video/MultiAnglePlayer';

// Content type for API response
interface ContentData {
  id: string;
  title: string;
  description?: string;
  type: string;
  thumbnail: string;
  mediaUrl?: string;
  videoUrl?: string;
  duration?: string | number;
  viewCount: number;
  likeCount: number;
  views?: number;
  likes?: number;
  isPremium?: boolean;
  isNSFW?: boolean;
  ageRestricted?: boolean;
  quality?: string[];
  tags?: Array<{ tag: { name: string } }> | string[];
  createdAt: string;
  isLiked?: boolean;
  creator: {
    id: string;
    userId?: string;
    handle: string;
    displayName?: string;
    name?: string;
    username?: string;
    avatar?: string;
    isVerified?: boolean;
    followers?: number;
  };
}

interface UserPreferences {
  theme: string;
  language: string;
  region?: string | null;
  hideHistory: boolean;
  anonymousMode: boolean;
  defaultQuality: string;
  autoplay: boolean;
  notifications: {
    email?: Record<string, boolean>;
    push?: Record<string, boolean>;
    inApp?: Record<string, boolean>;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  // Get current user from auth context (proper way)
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  const watchStartTimeRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [_watchDuration, _setWatchDuration] = useState<number>(0);

  // Content state - fetch from API
  const [content, setContent] = useState<ContentData | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [relatedContent, setRelatedContent] = useState<typeof mockContent>([]);
  const [similarContent, setSimilarContent] = useState<typeof mockContent>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Report dialog state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportType, setReportType] = useState('inappropriate');
  const [isReporting, setIsReporting] = useState(false);

  // Delete content state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit content state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Auto-play next state
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState(5);
  const upNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Reset auto-play state when video changes
  useEffect(() => {
    setShowUpNext(false);
    setUpNextCountdown(5);
    if (upNextTimerRef.current) {
      clearTimeout(upNextTimerRef.current);
    }
  }, [id]);

  // Fetch content from API
  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;

      setLoadingContent(true);
      setContentError(null);

      try {
        const response = await api.content.get<ContentData>(id);
        if (response.success && response.data) {
          // Transform API response to match expected format
          const data = response.data;
          const transformedContent: ContentData = {
            ...data,
            videoUrl: data.mediaUrl || data.videoUrl,
            duration: typeof data.duration === 'number'
              ? `${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}`
              : data.duration || '0:00',
            views: data.viewCount || data.views || 0,
            likes: data.likeCount || data.likes || 0,
            quality: data.quality || ['1080p', '720p', '480p'],
            tags: Array.isArray(data.tags)
              ? data.tags.map(t => typeof t === 'string' ? t : t.tag?.name || '')
              : [],
            creator: {
              ...data.creator,
              userId: (data.creator as any).userId,
              name: data.creator.displayName || data.creator.handle,
              username: data.creator.handle,
              followers: data.creator.followers || 0,
            },
          };
          setContent(transformedContent);
          setIsLiked(data.isLiked || false);
        } else {
          // Try mock data as fallback
          const mockItem = mockContent.find(c => c.id === id);
          if (mockItem) {
            setContent(mockItem as unknown as ContentData);
          } else {
            setContentError('Content not found');
          }
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
        // Try mock data as fallback
        const mockItem = mockContent.find(c => c.id === id);
        if (mockItem) {
          setContent(mockItem as unknown as ContentData);
        } else {
          setContentError('Failed to load content');
        }
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [id]);
  const [multiAngleData, _setMultiAngleData] = useState<{
    mainAngle: string;
    alternateAngles: Array<{ name: string; url: string; syncOffset?: number }>;
    allowSwitching: boolean;
  } | null>(null);

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
    let isMounted = true;
    
    if (id) {
      const trackView = async () => {
        try {
          if (isMounted) {
            await api.content.trackView(id, {});
          }
        } catch (error) {
          if (isMounted) {
            console.error('Failed to track view:', error);
          }
        }
      };
      trackView();
      
      // Set watch start time
      if (isMounted) {
        watchStartTimeRef.current = Date.now();
      }
    }
    
    // Cleanup: Track view event when component unmounts or content changes
    return () => {
      isMounted = false;
      
      if (id && watchStartTimeRef.current) {
        const duration = Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
        
        // Only track if we have content data (avoid stale refs)
        const currentContent = content;
        if (currentContent) {
          const contentDuration = parseDurationToSeconds(currentContent.duration);
          const completionRate = contentDuration > 0 ? Math.min(duration / contentDuration, 1) : 0;
          
          // Track detailed view event (fire and forget, no state updates)
          api.analytics.trackViewEvent({
            contentId: id,
            watchDuration: duration,
            completionRate,
            device: detectDevice(),
            region: preferences?.region || undefined,
          }).catch(error => {
            // Silently fail - component is unmounting
            if (import.meta.env.DEV) {
              console.error('Failed to track view event:', error);
            }
          });
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id, not content or preferences to avoid stale closures

  // Update watch duration periodically when playing
  useEffect(() => {
    if (!watchStartTimeRef.current || !isPlaying) return;

    const interval = setInterval(() => {
      if (watchStartTimeRef.current) {
        _setWatchDuration(Math.floor((Date.now() - watchStartTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle auto-play next countdown
  useEffect(() => {
    if (showUpNext && upNextCountdown > 0) {
      upNextTimerRef.current = setTimeout(() => {
        setUpNextCountdown(prev => prev - 1);
      }, 1000);
    } else if (showUpNext && upNextCountdown === 0 && relatedContent.length > 0) {
      // Navigate to next video
      const nextVideo = relatedContent[0];
      if (nextVideo) {
        navigate(`/watch/${nextVideo.id}`); // Ensure id is string
      }
    }

    return () => {
      if (upNextTimerRef.current) {
        clearTimeout(upNextTimerRef.current);
      }
    };
  }, [showUpNext, upNextCountdown, relatedContent, navigate]);

  // Cancel auto-play
  const cancelAutoPlay = () => {
    if (upNextTimerRef.current) {
      clearTimeout(upNextTimerRef.current);
    }
    setShowUpNext(false);
    setUpNextCountdown(5);
  };

  // Play next video immediately
  const playNextNow = () => {
    if (relatedContent.length > 0) {
      const nextVideo = relatedContent[0];
      if (nextVideo) {
        navigate(`/watch/${nextVideo.id}`); // Ensure id is string
      }
    }
  };

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
    } catch (error: unknown) {
      const err = error as { error?: { message?: string } };
      toast({
        title: 'Error',
        description: err?.error?.message || 'Failed to add to playlist',
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
    } catch (error: unknown) {
      const err = error as { error?: { message?: string } };
      toast({
        title: 'Error',
        description: err?.error?.message || 'Failed to create playlist',
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

  // Format time helper (seconds to MM:SS or HH:MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  // Handle seek on progress bar click
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * videoDuration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    const doc = document as any;
    const container = playerContainerRef.current as any;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          // Wait for video to be ready if needed
          if (videoRef.current.readyState < 2) {
            // Video not ready, wait for it to load
            await new Promise<void>((resolve, reject) => {
              const video = videoRef.current;
              if (!video) return reject(new Error('No video element'));
              const onCanPlay = () => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
                reject(new Error('Video failed to load'));
              };
              video.addEventListener('canplay', onCanPlay);
              video.addEventListener('error', onError);
              // Also trigger load if src is set but not loading
              if (video.networkState === 0) {
                video.load();
              }
            });
          }
          await videoRef.current.play();
          setIsPlaying(true);
          if (!watchStartTimeRef.current) {
            watchStartTimeRef.current = Date.now();
          }
        } catch (error) {
          console.error('Failed to play video:', error);
          // Try muted autoplay as fallback (browsers may block unmuted autoplay)
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            try {
              await videoRef.current.play();
              setIsPlaying(true);
              toast({
                title: 'Playback started muted',
                description: 'Click the volume button to unmute',
              });
            } catch (e) {
              toast({
                title: 'Playback failed',
                description: 'Unable to play video. Please try again.',
                variant: 'destructive',
              });
            }
          }
        }
      }
    }
  };

  // Show loading state
  if (loadingContent) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </Layout>
    );
  }

  // Show error or not found state
  if (!content || contentError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{contentError || 'Content not found'}</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleLike = async () => {
    if (!id) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    if (isDisliked) setIsDisliked(false);

    // Call content like API
    try {
      const response = await api.content.like(id);
      if (!response.success) {
        // Revert on failure
        setIsLiked(!newLikedState);
        toast({
          title: 'Error',
          description: 'Failed to update like status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to like content:', error);
      setIsLiked(!newLikedState);
    }
  };

  const handleDislike = async () => {
    const newDislikedState = !isDisliked;
    setIsDisliked(newDislikedState);
    if (isLiked) setIsLiked(false);
    // Dislike is handled locally only (no backend API for dislike)
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/watch/${id}`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: content?.title || 'Check out this content',
          url: url,
        });
      } catch (error) {
        // User cancelled or error - fallback to clipboard
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast({
            title: 'Link copied',
            description: 'Video link copied to clipboard',
          });
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Video link copied to clipboard',
      });
    }
  };

  const handleSave = async () => {
    // This just opens the playlist dialog - no API call needed here
  };

  // Handle Watch Later - adds to special "Watch Later" playlist
  const handleWatchLater = async () => {
    if (!id || !currentUserId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add to Watch Later',
        variant: 'destructive',
      });
      return;
    }

    try {
      // First, check if Watch Later playlist exists
      const playlistsResponse = await api.playlists.get<Playlist[]>();
      let watchLaterPlaylist = playlistsResponse.data?.find(
        (p: Playlist) => p.name === 'Watch Later'
      );

      // Create Watch Later playlist if it doesn't exist
      if (!watchLaterPlaylist) {
        const createResponse = await api.playlists.post<Playlist>({
          name: 'Watch Later',
          isPublic: false,
        });
        if (createResponse.success && createResponse.data) {
          watchLaterPlaylist = createResponse.data;
        } else {
          throw new Error('Failed to create Watch Later playlist');
        }
      }

      // Add content to Watch Later playlist
      if (watchLaterPlaylist) {
        const addResponse = await api.playlists.addItem(watchLaterPlaylist.id, {
          contentId: id,
        });
        if (addResponse.success) {
          toast({
            title: 'Added to Watch Later',
            description: 'Content saved to your Watch Later list',
          });
        } else {
          throw new Error(addResponse.error || 'Failed to add to Watch Later');
        }
      }
    } catch (error: any) {
      console.error('Watch Later error:', error);
      // Check if content is already in playlist
      const errorMsg = error?.message || error?.error || '';
      if (errorMsg.toLowerCase().includes('already in playlist')) {
        toast({
          title: 'Already Saved',
          description: 'This content is already in your Watch Later list',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add to Watch Later',
          variant: 'destructive',
        });
      }
    }
  };

  // Handle report content
  const handleReportContent = async () => {
    if (!id || !reportReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for reporting',
        variant: 'destructive',
      });
      return;
    }

    // Map frontend type to backend enum values
    const typeMap: Record<string, string> = {
      'inappropriate': 'INAPPROPRIATE_CONTENT',
      'spam': 'SPAM',
      'harassment': 'HARASSMENT',
      'copyright': 'COPYRIGHT_VIOLATION',
      'misleading': 'OTHER',
      'other': 'OTHER',
    };

    setIsReporting(true);
    try {
      const response = await api.moderation.createReport({
        contentType: 'content',
        contentId: id,
        type: typeMap[reportType] || 'OTHER',
        reason: reportReason,
        description: reportReason,
      });

      if (response.success) {
        toast({
          title: 'Report Submitted',
          description: 'Thank you for your report. Our team will review it shortly.',
        });
        setShowReportDialog(false);
        setReportReason('');
        setReportType('inappropriate');
      } else {
        throw new Error(response.error || 'Failed to submit report');
      }
    } catch (error: any) {
      console.error('Report error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setIsReporting(false);
    }
  };

  // Check if current user is the owner of this content
  // Compare user.id (User table) with creator.userId (Creator's User ID)
  const isOwner = user && content?.creator && content.creator.userId && (
    user.id === content.creator.userId
  );

  // Handle delete content
  const handleDeleteContent = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const response = await api.content.delete(id);

      if (response.success) {
        toast({
          title: 'Content Deleted',
          description: 'Your content has been permanently deleted.',
        });
        // Navigate to home or creator profile
        navigate('/');
      } else {
        throw new Error((response.error as any)?.message || 'Failed to delete content');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete content',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Open edit dialog and initialize form
  const openEditDialog = () => {
    if (content) {
      setEditTitle(content.title);
      setEditDescription(content.description || '');
      setEditIsPremium(content.isPremium || false);
      setShowEditDialog(true);
    }
  };

  // Handle update content
  const handleUpdateContent = async () => {
    if (!id) return;

    setIsUpdating(true);
    try {
      const response = await api.content.update(id, {
        title: editTitle,
        description: editDescription,
        isPremium: editIsPremium,
      });

      if (response.success) {
        toast({
          title: 'Content Updated',
          description: 'Your content has been updated successfully.',
        });
        // Update local state
        if (content) {
          setContent({
            ...content,
            title: editTitle,
            description: editDescription,
            isPremium: editIsPremium,
          });
        }
        setShowEditDialog(false);
      } else {
        throw new Error((response.error as any)?.message || 'Failed to update content');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update content',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{content.title} - PassionFantasia</title>
        <meta name="description" content={content.description || `Watch ${content.title} by ${content.creator.name}`} />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Video Player - Multi-Angle or Standard */}
              {multiAngleData ? (
                <MultiAnglePlayer
                  contentId={id || ''}
                  mainAngle={multiAngleData.mainAngle}
                  alternateAngles={multiAngleData.alternateAngles}
                  allowSwitching={multiAngleData.allowSwitching}
                  autoplay={false}
                />
              ) : (
              <div ref={playerContainerRef} className="relative aspect-video bg-black rounded-xl overflow-hidden group" data-testid="video-player">
                <video
                  ref={videoRef}
                  src={content.videoUrl || content.mediaUrl || content.thumbnail}
                  poster={content.thumbnail}
                  className="w-full h-full object-contain"
                  controls={false}
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onWaiting={() => {
                    // Video is buffering - show loading indicator
                    setIsBuffering(true);
                  }}
                  onCanPlay={() => {
                    // Video can play - hide loading indicator
                    setIsBuffering(false);
                  }}
                  onCanPlayThrough={() => {
                    // Enough data buffered for continuous playback
                    setIsBuffering(false);
                  }}
                  onPlaying={() => {
                    // Video started/resumed playing
                    setIsBuffering(false);
                    setIsPlaying(true);
                  }}
                  onProgress={() => {
                    // Track buffered progress for progress bar
                    if (videoRef.current && videoRef.current.buffered.length > 0) {
                      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
                      const duration = videoRef.current.duration;
                      if (duration > 0) {
                        setBufferedPercent((bufferedEnd / duration) * 100);
                      }
                    }
                  }}
                  onSeeking={() => {
                    // User is seeking - might need to buffer
                    setIsBuffering(true);
                  }}
                  onSeeked={() => {
                    // Seek complete
                    setIsBuffering(false);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    // Emit video-ended event for series auto-play
                    if (id) {
                      window.dispatchEvent(new CustomEvent('video-ended', {
                        detail: { contentId: id }
                      }));
                    }
                    // Show auto-play next if enabled and has related content
                    if (preferences?.autoplay && relatedContent.length > 0) {
                      setUpNextCountdown(5);
                      setShowUpNext(true);
                    }
                  }}
                />
                <img 
                  src={content.thumbnail} 
                  alt={content.title}
                  className={cn(
                    "w-full h-full object-cover absolute inset-0 transition-opacity pointer-events-none",
                    isPlaying ? "opacity-0" : "opacity-100"
                  )}
                />
                
                {/* Buffering indicator */}
                {isBuffering && isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <span className="text-white text-sm">Buffering...</span>
                    </div>
                  </div>
                )}

                {/* Play overlay */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors cursor-pointer",
                  (isPlaying || isBuffering) && "opacity-0 pointer-events-none"
                )}
                  onClick={togglePlayPause}
                >
                  <button
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
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/80 to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Progress bar with buffer indicator */}
                  <div
                    className="w-full h-2 sm:h-1 bg-white/20 rounded-full mb-2 sm:mb-4 cursor-pointer touch-none relative overflow-hidden"
                    onClick={handleSeek}
                  >
                    {/* Buffered progress (lighter) */}
                    <div
                      className="absolute h-full bg-white/30 rounded-full transition-all"
                      style={{ width: `${bufferedPercent}%` }}
                    />
                    {/* Current progress (primary color) */}
                    <div
                      className="absolute h-full bg-primary rounded-full transition-all z-10"
                      style={{ width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : '0%' }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary h-10 w-10 sm:h-9 sm:w-9"
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? <Pause className="h-5 w-5 sm:h-5 sm:w-5" /> : <Play className="h-5 w-5 sm:h-5 sm:w-5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary h-10 w-10 sm:h-9 sm:w-9"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <span className="text-white text-xs sm:text-sm">{formatTime(currentTime)} / {formatTime(videoDuration) || content.duration || '0:00'}</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
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
                          {(content.quality || ['1080p', '720p', '480p']).map(q => (
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary"
                        onClick={toggleFullscreen}
                      >
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
                  {content.quality?.includes('4K') && (
                    <Badge variant="secondary">4K</Badge>
                  )}
                </div>

                {/* Up Next Overlay */}
                {showUpNext && relatedContent.length > 0 && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                    <div className="text-center text-white max-w-md px-4">
                      <p className="text-sm text-gray-300 mb-2">Up Next in {upNextCountdown}s</p>
                      <h3 className="text-lg font-semibold mb-4 line-clamp-2">{relatedContent[0]?.title}</h3>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <img
                          src={relatedContent[0]?.thumbnail}
                          alt={relatedContent[0]?.title}
                          className="w-32 h-20 object-cover rounded"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelAutoPlay}
                          className="bg-white/10 border-white/20 hover:bg-white/20"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={playNextNow}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Title & Actions */}
              <div>
                <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold mb-2">{content.title}</h1>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <span>{(content.views || content.viewCount || 0).toLocaleString()} views</span>
                  <span>•</span>
                  <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Creator */}
                  <Link to={`/creator/${content.creator.username}`} className="flex items-center gap-2 sm:gap-3 group">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/50">
                      <AvatarImage src={content.creator.avatar} alt={`${content.creator.name || content.creator.displayName || 'Creator'} avatar`} />
                      <AvatarFallback>{(content.creator.name || content.creator.displayName || 'C')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {content.creator.name || content.creator.displayName || content.creator.handle}
                        </span>
                        {content.creator.isVerified && (
                          <Zap className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {((content.creator.followers || 0) / 1000).toFixed(1)}K followers
                      </p>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Button
                      variant={isLiked ? 'default' : 'secondary'}
                      size="sm"
                      className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                      onClick={handleLike}
                      data-testid="like-button"
                    >
                      <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
                      <span className="text-xs sm:text-sm">{((content.likes || content.likeCount || 0) + (isLiked ? 1 : 0)).toLocaleString()}</span>
                    </Button>
                    <Button
                      variant={isDisliked ? 'destructive' : 'secondary'}
                      size="sm"
                      className="h-9 px-2 sm:px-3"
                      onClick={handleDislike}
                    >
                      <ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden xs:inline">Share</span>
                    </Button>
                    <Dialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist}>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                          onClick={handleSave}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden xs:inline">Save</span>
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
                        <DropdownMenuItem
                          onClick={async () => {
                            if (!id) return;
                            try {
                              const response = await api.downloads.create({
                                contentId: id,
                                quality: selectedQuality === 'auto' ? undefined : selectedQuality,
                              });
                              if (response.success) {
                                toast({
                                  title: 'Download started',
                                  description: 'Your download has been queued. Check your library to see progress.',
                                });
                              }
                            } catch (error: unknown) {
                              const errorMessage = error instanceof Error ? error.message : 'Failed to start download';
                              toast({
                                title: 'Download failed',
                                description: errorMessage,
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleWatchLater}>
                          <Clock className="h-4 w-4 mr-2" />
                          Watch Later
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setShowReportDialog(true)}
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                        {isOwner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={openEditDialog}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Video
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setShowDeleteDialog(true)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Video
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Video
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this video? This action cannot be undone.
                            The video and all associated data (comments, likes, views) will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteContent}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Report Dialog */}
                    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Report Content</DialogTitle>
                          <DialogDescription>
                            Help us understand what's wrong with this content. Your report will be reviewed by our moderation team.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Report Type</Label>
                            <select
                              value={reportType}
                              onChange={(e) => setReportType(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background"
                            >
                              <option value="inappropriate">Inappropriate Content</option>
                              <option value="spam">Spam</option>
                              <option value="harassment">Harassment</option>
                              <option value="copyright">Copyright Violation</option>
                              <option value="misleading">Misleading Information</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="report-reason">Describe the issue</Label>
                            <textarea
                              id="report-reason"
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              placeholder="Please provide details about why you're reporting this content..."
                              className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px] resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleReportContent}
                            disabled={isReporting || !reportReason.trim()}
                            variant="destructive"
                          >
                            {isReporting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              'Submit Report'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Content Dialog */}
                    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Video</DialogTitle>
                          <DialogDescription>
                            Update your video details and settings.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                              id="edit-title"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Video title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <textarea
                              id="edit-description"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Video description..."
                              className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px] resize-none"
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10">
                            <div className="flex items-center gap-3">
                              <Crown className="h-5 w-5 text-pink-500" />
                              <div>
                                <Label htmlFor="edit-premium" className="text-sm font-medium">
                                  Premium Content
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Only subscribers can view this content
                                </p>
                              </div>
                            </div>
                            <Switch
                              id="edit-premium"
                              checked={editIsPremium}
                              onCheckedChange={setEditIsPremium}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdateContent}
                            disabled={isUpdating || !editTitle.trim()}
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="bg-muted/30 rounded-xl p-4">
                <ExpandableDescription
                  description={content.description || ''}
                  maxLines={3}
                  className="mb-4"
                />
                <div className="flex flex-wrap gap-2">
                  {(content.tags as string[] || []).map((tag: string) => (
                    <TagBadge key={tag} tag={tag} />
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
