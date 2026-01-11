import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
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
  Crown,
  RotateCcw,
  RotateCw,
  PictureInPicture
} from 'lucide-react';
import Hls from 'hls.js';
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
  const [stallCount, setStallCount] = useState(0);
  const [wantsToPlay, setWantsToPlay] = useState(false);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<'ready' | 'processing' | 'checking'>('checking');
  const [videoStatusMessage, setVideoStatusMessage] = useState<string>('');
  const [isVideoOptimized, setIsVideoOptimized] = useState<boolean>(true);
  // Enhanced video player state
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ direction: 'forward' | 'backward'; show: boolean }>({ direction: 'forward', show: false });
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayPositionRef = useRef<number>(0);
  const playbackCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef<boolean>(false); // Track if play() is in progress to prevent race conditions
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
  const upNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Reset and cleanup when video changes (navigating to new video)
  useEffect(() => {
    // Stop current video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = ''; // Clear source to stop any loading
      videoRef.current.load(); // Reset the video element
    }

    // Destroy HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Clear all timers
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    if (playbackCheckIntervalRef.current) {
      clearInterval(playbackCheckIntervalRef.current);
      playbackCheckIntervalRef.current = null;
    }
    if (upNextTimerRef.current) {
      clearTimeout(upNextTimerRef.current);
      upNextTimerRef.current = null;
    }

    // Reset all playback states
    setIsPlaying(false);
    setIsBuffering(false);
    setWantsToPlay(false);
    setCurrentTime(0);
    setVideoDuration(0);
    setBufferedPercent(0);
    setStallCount(0);
    setShowUpNext(false);
    setUpNextCountdown(5);
    lastPlayPositionRef.current = 0;
    watchStartTimeRef.current = null;
    isPlayingRef.current = false;
  }, [id]);

  // Safe play function that prevents race conditions
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isPlayingRef.current) return;

    // Don't try to play if video has no source
    if (!video.src && !video.currentSrc) return;

    isPlayingRef.current = true;
    try {
      await video.play();
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (error: any) {
      // AbortError is expected when play is interrupted - not a real error
      if (error.name !== 'AbortError') {
        console.warn('Play failed:', error.message);
      }
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

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
          console.log('📹 Video data:', { mediaUrl: data.mediaUrl, videoUrl: data.videoUrl, duration: data.duration });
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

  // Check video processing status for newly uploaded videos
  useEffect(() => {
    if (!id || !content) return;

    // Only check for Mux or Cloudflare Stream videos
    const mediaUrl = content.mediaUrl || content.videoUrl;
    if (!mediaUrl?.includes('stream.mux.com') && !mediaUrl?.includes('cloudflarestream.com')) {
      setVideoProcessingStatus('ready');
      return;
    }

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;
    let isReady = false; // Track ready status locally to avoid dependency issues

    const checkVideoStatus = async () => {
      if (isReady) return; // Don't poll if already ready

      try {
        const response = await api.content.getVideoStatus<{ status: string; message: string; isOptimized?: boolean }>(id);
        if (!isMounted) return;

        if (response.success && response.data) {
          const { status, message, isOptimized } = response.data;
          setVideoStatusMessage(message);
          setIsVideoOptimized(isOptimized !== false); // Default to true if not specified

          if (status === 'ready') {
            isReady = true;
            setVideoProcessingStatus('ready');
            // Stop polling when ready
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          } else {
            setVideoProcessingStatus('processing');
          }
        }
      } catch (error) {
        console.error('Failed to check video status:', error);
        // Assume ready if we can't check
        if (isMounted) {
          isReady = true;
          setVideoProcessingStatus('ready');
        }
      }
    };

    // Initial check
    setVideoProcessingStatus('checking');
    checkVideoStatus();

    // Poll every 10 seconds while processing (reduced frequency)
    pollInterval = setInterval(() => {
      if (!isReady) {
        checkVideoStatus();
      }
    }, 10000);

    return () => {
      isMounted = false;
      isReady = true; // Prevent any pending checks
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id, content]); // Removed videoProcessingStatus from dependencies to prevent re-running

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

  // Initialize HLS.js for adaptive streaming and stall recovery
  useEffect(() => {
    if (!content || !videoRef.current) return;

    const video = videoRef.current;
    const videoUrl = content.videoUrl || content.mediaUrl;
    if (!videoUrl) return;

    const isHLSSource = videoUrl.endsWith('.m3u8') || videoUrl.includes('.m3u8');

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHLSSource && Hls.isSupported()) {
      // Use HLS.js for adaptive streaming
      const hls = new Hls({
        // Aggressive buffering for smooth playback
        maxBufferLength: 60,              // Buffer up to 60 seconds ahead
        maxMaxBufferLength: 120,          // Maximum buffer size 2 minutes
        maxBufferSize: 120 * 1000 * 1000, // 120MB max buffer
        maxBufferHole: 0.5,               // Max gap to jump over
        lowLatencyMode: false,            // Prioritize smooth playback over latency
        startLevel: -1,                   // Auto select quality
        abrEwmaDefaultEstimate: 1000000,  // Start estimate 1Mbps
        abrBandWidthFactor: 0.95,         // Conservative bandwidth usage
        abrBandWidthUpFactor: 0.7,        // Slow quality upgrades
        // Fragment loading settings - more retries
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 64000,
        // Level loading settings
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 500,
        // Enable back buffer for seeking
        backBufferLength: 60,
        // Start loading immediately
        startFragPrefetch: true,
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              // Try to reload
              setTimeout(() => {
                hls.destroy();
                hls.loadSource(videoUrl);
                hls.attachMedia(video);
              }, 1000);
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHLSSource) {
      // Native HLS support (Safari)
      video.src = videoUrl;
      video.preload = 'auto';
    } else {
      // Regular MP4/WebM - ensure source is set with aggressive preloading
      video.src = videoUrl;
      video.preload = 'auto'; // Preload as much as possible

      // Force start loading immediately
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [content]);

  // Stall detection and auto-recovery
  const handleStallRecovery = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    // Check if video is actually stalled (position not moving while playing)
    if (video.currentTime === lastPlayPositionRef.current && !video.paused && !video.ended) {
      setStallCount(prev => prev + 1);
      setIsBuffering(true);

      // Try recovery methods
      if (stallCount < 3) {
        // Method 1: Small seek to unstick
        const seekOffset = 0.1;
        const newTime = video.currentTime + seekOffset;
        // Only set if both values are finite numbers
        if (Number.isFinite(newTime) && Number.isFinite(video.duration)) {
          video.currentTime = Math.min(newTime, video.duration - 1);
        }
      } else if (stallCount < 6) {
        // Method 2: Pause and resume
        video.pause();
        setTimeout(() => {
          safePlay();
        }, 100);
      } else {
        // Method 3: Reload video source
        const currentPos = video.currentTime;
        const src = video.src;
        video.src = '';
        video.load();
        video.src = src;
        // Only restore position if it's a valid finite number
        if (Number.isFinite(currentPos)) {
          video.currentTime = currentPos;
        }
        safePlay();
        setStallCount(0);
      }
    } else {
      // Video is playing fine, reset stall count
      if (stallCount > 0) setStallCount(0);
      if (isBuffering && video.readyState >= 3) setIsBuffering(false);
    }

    lastPlayPositionRef.current = video.currentTime;
  }, [isPlaying, stallCount, isBuffering, safePlay]);

  // Start stall detection when playing
  useEffect(() => {
    if (isPlaying) {
      // Check every 2 seconds for stalls
      playbackCheckIntervalRef.current = setInterval(handleStallRecovery, 2000);
    } else {
      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }
    };
  }, [isPlaying, handleStallRecovery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (playbackCheckIntervalRef.current) clearInterval(playbackCheckIntervalRef.current);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

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
          const contentDuration = parseDurationToSeconds(String(currentContent.duration || '0:00'));
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

  // Skip forward/backward
  const skipTime = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = newTime;

    // Show visual feedback
    setSeekFeedback({ direction: seconds > 0 ? 'forward' : 'backward', show: true });
    setTimeout(() => setSeekFeedback(prev => ({ ...prev, show: false })), 500);
  }, []);

  // Change volume
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    video.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  }, []);

  // Change playback speed
  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  }, []);

  // Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.warn('PiP not supported:', error);
    }
  }, []);

  // Progress bar interaction
  const handleProgressBarInteraction = useCallback((e: React.MouseEvent | React.TouchEvent, action: 'hover' | 'click' | 'drag') => {
    const progressBar = progressBarRef.current;
    const video = videoRef.current;
    if (!progressBar || !video || !Number.isFinite(video.duration)) return;

    const rect = progressBar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * video.duration;

    if (action === 'hover') {
      setHoverTime(time);
    } else if (action === 'click' || action === 'drag') {
      video.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    if (isPlaying && !isDraggingProgress) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isDraggingProgress]);

  // Handle visibility change (when user switches apps/tabs and comes back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to the tab - show controls and sync state
        setShowControls(true);

        // Clear any pending hide timeout
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }

        // Sync video state with actual video element
        const video = videoRef.current;
        if (video) {
          setIsPlaying(!video.paused);
          setIsMuted(video.muted);
          setVolume(video.volume);
          if (Number.isFinite(video.currentTime)) {
            setCurrentTime(video.currentTime);
          }
          if (Number.isFinite(video.duration)) {
            setVideoDuration(video.duration);
          }
        }

        // Set a new hide timeout if video is playing
        if (videoRef.current && !videoRef.current.paused) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        }
      } else {
        // User left the tab - clear timeouts and show controls for when they return
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }
        setShowControls(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle window focus/blur for better cross-browser support
    const handleFocus = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      // Sync state
      const video = videoRef.current;
      if (video) {
        setIsPlaying(!video.paused);
        if (!video.paused) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying || wantsToPlay) {
      video.pause();
      setIsPlaying(false);
      setWantsToPlay(false);
      isPlayingRef.current = false;
    } else {
      setWantsToPlay(true);
      setIsBuffering(true);

      // Ensure video source is set
      if (!video.src && !video.currentSrc) {
        const videoUrl = content?.videoUrl || content?.mediaUrl;
        if (videoUrl) {
          video.src = videoUrl;
          video.load();
        }
      }

      // Wait for video to have enough data to play
      if (video.readyState < 2) {
        // Video not ready yet, safePlay will be called by event handlers
        // when video is ready (onCanPlay, onCanPlayThrough)
        return;
      }

      // Video is ready, try to play
      try {
        await safePlay();
        if (!watchStartTimeRef.current) {
          watchStartTimeRef.current = Date.now();
        }
      } catch (error: any) {
        // Ignore AbortError - it's expected when play is interrupted
        if (error.name === 'AbortError') return;

        console.warn('Play failed, trying muted:', error.message);
        // Try muted autoplay as fallback (browsers may block unmuted autoplay)
        video.muted = true;
        setIsMuted(true);
        try {
          await safePlay();
          toast({
            title: 'Playback started muted',
            description: 'Click the volume button to unmute',
          });
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            setWantsToPlay(false);
            setIsBuffering(false);
            toast({
              title: 'Playback failed',
              description: 'Unable to play video. Please try again.',
              variant: 'destructive',
            });
          }
        }
      }
    }
  }, [isPlaying, wantsToPlay, content, safePlay, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(!isMuted);
          if (video) video.muted = !isMuted;
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          if (Number.isFinite(video.duration)) {
            video.currentTime = (parseInt(e.key) / 10) * video.duration;
          }
          break;
        case ',':
          e.preventDefault();
          skipTime(-1/30); // Frame back (assuming 30fps)
          break;
        case '.':
          e.preventDefault();
          skipTime(1/30); // Frame forward
          break;
        case '<':
          e.preventDefault();
          handleSpeedChange(Math.max(0.25, playbackSpeed - 0.25));
          break;
        case '>':
          e.preventDefault();
          handleSpeedChange(Math.min(2, playbackSpeed + 0.25));
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, toggleFullscreen, isMuted, volume, playbackSpeed, skipTime, handleVolumeChange, handleSpeedChange, togglePiP, resetControlsTimeout]);

  // Auto-resume playback after buffering completes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If user wants to play and video can play, resume
    if (wantsToPlay && !isPlaying && video.readyState >= 3 && video.paused) {
      safePlay();
    }
  }, [wantsToPlay, isPlaying, isBuffering, safePlay]);

  // Ensure video plays when buffering ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlayThrough = () => {
      if (wantsToPlay && video.paused) {
        safePlay();
      }
    };

    video.addEventListener('canplaythrough', handleCanPlayThrough);
    return () => video.removeEventListener('canplaythrough', handleCanPlayThrough);
  }, [wantsToPlay, safePlay]);

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
          throw new Error(addResponse.error?.message || 'Failed to add to Watch Later');
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
        throw new Error(response.error?.message || 'Failed to submit report');
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
                    // Video can play - hide loading indicator and resume if user wants to play
                    setIsBuffering(false);
                    if (wantsToPlay && videoRef.current?.paused) {
                      safePlay();
                    }
                  }}
                  onCanPlayThrough={() => {
                    // Enough data buffered for continuous playback - resume if user wants to play
                    setIsBuffering(false);
                    if (wantsToPlay && videoRef.current?.paused) {
                      safePlay();
                    }
                  }}
                  onPlaying={() => {
                    // Video started/resumed playing
                    setIsBuffering(false);
                    setIsPlaying(true);
                    lastPlayPositionRef.current = videoRef.current?.currentTime || 0;
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
                  onStalled={() => {
                    // Network stall detected
                    setIsBuffering(true);
                    handleStallRecovery();
                  }}
                  onSeeking={() => {
                    // User is seeking - might need to buffer
                    setIsBuffering(true);
                  }}
                  onSeeked={() => {
                    // Seek complete - resume if user wants to play
                    setIsBuffering(false);
                    if (wantsToPlay && videoRef.current?.paused) {
                      safePlay();
                    }
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
                  onError={(e) => {
                    const video = e.currentTarget;
                    const error = video.error;
                    console.error('❌ Video error:', {
                      code: error?.code,
                      message: error?.message,
                      src: video.src,
                      networkState: video.networkState,
                      readyState: video.readyState,
                    });
                    setIsBuffering(false);
                    setWantsToPlay(false);
                    toast({
                      title: 'Video Error',
                      description: `Failed to load video: ${error?.message || 'Unknown error'}`,
                      variant: 'destructive',
                    });
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
                
                {/* Video Processing indicator (Mux transcoding) */}
                {videoProcessingStatus === 'processing' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="flex flex-col items-center gap-3 text-center px-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <span className="text-white font-medium">Video Processing...</span>
                      <span className="text-gray-400 text-sm max-w-xs">
                        {videoStatusMessage || 'Your video is being processed for optimal streaming. This may take a few minutes.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Buffering indicator */}
                {isBuffering && (isPlaying || wantsToPlay) && videoProcessingStatus === 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <span className="text-white text-sm">Buffering...</span>
                      {!isVideoOptimized && (
                        <span className="text-yellow-400 text-xs">Video not optimized for streaming</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Non-optimized video warning banner */}
                {!isVideoOptimized && videoProcessingStatus === 'ready' && showControls && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="px-3 py-1.5 bg-yellow-900/80 border border-yellow-600/50 rounded-md text-xs text-yellow-200 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Loading from storage (may be slower)</span>
                    </div>
                  </div>
                )}

                {/* Seek Feedback Overlay */}
                {seekFeedback.show && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 bg-black/70 rounded-lg animate-in fade-in zoom-in duration-200",
                      seekFeedback.direction === 'forward' ? 'translate-x-4' : '-translate-x-4'
                    )}>
                      {seekFeedback.direction === 'backward' ? (
                        <RotateCcw className="h-6 w-6 text-white" />
                      ) : (
                        <RotateCw className="h-6 w-6 text-white" />
                      )}
                      <span className="text-white font-medium">10s</span>
                    </div>
                  </div>
                )}

                {/* Center Play/Pause Button */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-300",
                    (isPlaying && showControls) || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  onClick={togglePlayPause}
                  onMouseMove={resetControlsTimeout}
                >
                  {/* Double-tap areas for mobile seek */}
                  <div className="absolute left-0 top-0 w-1/3 h-full" onDoubleClick={() => skipTime(-10)} />
                  <div className="absolute right-0 top-0 w-1/3 h-full" onDoubleClick={() => skipTime(10)} />

                  {!isPlaying && !isBuffering && (
                    <button className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary hover:scale-110 transition-all duration-200 shadow-2xl">
                      <Play className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground ml-1" fill="currentColor" />
                    </button>
                  )}
                </div>

                {/* Controls Overlay */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 pb-2 sm:pb-4",
                    showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  onMouseMove={resetControlsTimeout}
                  onMouseEnter={() => setShowControls(true)}
                >
                  {/* Progress Bar */}
                  <div className="px-2 sm:px-4 mb-2 sm:mb-3">
                    <div
                      ref={progressBarRef}
                      className="group/progress relative h-1 sm:h-1.5 bg-white/20 rounded-full cursor-pointer touch-none hover:h-2 sm:hover:h-2.5 transition-all duration-150"
                      onClick={(e) => handleProgressBarInteraction(e, 'click')}
                      onMouseMove={(e) => handleProgressBarInteraction(e, 'hover')}
                      onMouseLeave={() => setHoverTime(null)}
                      onMouseDown={() => setIsDraggingProgress(true)}
                      onMouseUp={() => setIsDraggingProgress(false)}
                      onTouchStart={() => setIsDraggingProgress(true)}
                      onTouchEnd={() => setIsDraggingProgress(false)}
                    >
                      {/* Buffered */}
                      <div
                        className="absolute h-full bg-white/30 rounded-full transition-all"
                        style={{ width: `${bufferedPercent}%` }}
                      />
                      {/* Progress */}
                      <div
                        className="absolute h-full bg-primary rounded-full transition-all"
                        style={{ width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : '0%' }}
                      >
                        {/* Thumb */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
                      </div>
                      {/* Hover Preview */}
                      {hoverTime !== null && videoDuration > 0 && (
                        <div
                          className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded text-white text-xs whitespace-nowrap"
                          style={{ left: `${(hoverTime / videoDuration) * 100}%` }}
                        >
                          {formatTime(hoverTime)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between px-2 sm:px-4">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {/* Play/Pause */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      {/* Skip Backward */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                        onClick={() => skipTime(-10)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      {/* Skip Forward */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                        onClick={() => skipTime(10)}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>

                      {/* Volume Control */}
                      <div className="flex items-center group/volume">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                          onClick={() => {
                            setIsMuted(!isMuted);
                            if (videoRef.current) videoRef.current.muted = !isMuted;
                          }}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-5 w-5" />
                          ) : volume < 0.5 ? (
                            <Volume1 className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                          <input
                            id="volume-slider"
                            name="volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                          />
                        </div>
                      </div>

                      {/* Time Display */}
                      <span className="text-white text-xs sm:text-sm ml-1 sm:ml-2 tabular-nums">
                        {formatTime(currentTime)} / {formatTime(videoDuration) || content.duration || '0:00'}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {/* Playback Speed */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-white hover:text-primary hover:bg-white/10 h-9 px-2 text-xs sm:text-sm">
                            {playbackSpeed}x
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                            <DropdownMenuItem
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={playbackSpeed === speed ? 'bg-muted' : ''}
                            >
                              {speed}x {playbackSpeed === speed && '✓'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Quality Selector */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10">
                            <Settings className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedQuality('auto')}
                            className={selectedQuality === 'auto' ? 'bg-muted' : ''}
                          >
                            Auto {selectedQuality === 'auto' && '✓'}
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

                      {/* Picture-in-Picture */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                        onClick={togglePiP}
                      >
                        <PictureInPicture className="h-5 w-5" />
                      </Button>

                      {/* Fullscreen */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-primary hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
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
                            <Label htmlFor="report-type">Report Type</Label>
                            <select
                              id="report-type"
                              name="report-type"
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
