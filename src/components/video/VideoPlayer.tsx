import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VideoPlayerSkeleton } from './VideoPlayerSkeleton';
import { preconnectVideoCDN } from '@/lib/videoUtils';
import { GestureControls, SeekIndicator } from '@/components/mobile/GestureControls';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import Hls from 'hls.js';

interface SeekIndicatorState {
  visible: boolean;
  side: 'left' | 'right';
  type: 'seek' | 'volume' | 'brightness';
  value: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  live?: boolean;
  lowLatency?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onProductInfo?: (productId: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  subtitleTracks?: Array<{
    src: string;
    srcLang: string;
    label: string;
    default?: boolean;
  }>;
}

/**
 * Optimized Video Player Component
 * Features:
 * - HLS.js adaptive streaming with optimized buffering
 * - Preload and buffer ahead for smooth playback
 * - Visual buffer progress indicator
 * - Quality switching support
 */
export function VideoPlayer({
  src,
  poster,
  autoplay = false,
  controls = true,
  className,
  live = false,
  lowLatency = false,
  onPlay,
  onPause,
  onEnded,
  onProductInfo: _onProductInfo,
  videoRef: externalVideoRef,
  onTimeUpdate,
  subtitleTracks,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seekIndicator, setSeekIndicator] = useState<SeekIndicatorState>({
    visible: false,
    side: 'right',
    type: 'seek',
    value: 0,
  });

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  // Preconnect to video CDN on mount
  useEffect(() => {
    if (src) {
      try {
        const cdnUrl = new URL(src).origin;
        preconnectVideoCDN(cdnUrl);
      } catch {
        // Invalid URL, skip preconnect
      }
    }
  }, [src]);

  // Initialize HLS.js for .m3u8 streams or use native playback
  useEffect(() => {
    if (!shouldLoad || !videoRef.current || !src) return;

    const video = videoRef.current;
    const isHLS = src.endsWith('.m3u8') || src.includes('.m3u8');

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for adaptive streaming with optimized buffering
      const hls = new Hls({
        // Buffering settings for smooth playback
        maxBufferLength: 30,              // Buffer up to 30 seconds ahead
        maxMaxBufferLength: 60,           // Maximum buffer size
        maxBufferSize: 60 * 1000 * 1000,  // 60MB max buffer
        maxBufferHole: 0.5,               // Max gap to jump over
        lowLatencyMode: lowLatency,
        // Start with lower quality for faster initial load
        startLevel: -1,                   // Auto select
        abrEwmaDefaultEstimate: 500000,   // Start estimate 500kbps
        // Fragment loading settings
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        // Level loading settings
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        // Enable back buffer for seeking
        backBufferLength: 30,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoplay) {
          video.play().catch(() => {
            // Autoplay blocked, wait for user interaction
            setIsPlaying(false);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      setIsLoading(false);
    } else {
      // Regular MP4/WebM playback
      video.src = src;
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [shouldLoad, src, autoplay, lowLatency]);

  // Update buffer progress
  const updateBufferProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const buffered = video.buffered;
    if (buffered.length > 0) {
      // Find the buffer range containing current time
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= video.currentTime && video.currentTime <= buffered.end(i)) {
          const bufferedEnd = buffered.end(i);
          setBufferedPercent((bufferedEnd / video.duration) * 100);
          break;
        }
      }
    }
  }, [videoRef]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = (e: Event) => {
      setCurrentTime(video.currentTime);
      updateBufferProgress();
      onTimeUpdate?.(e as unknown as React.SyntheticEvent<HTMLVideoElement>);
    };

    const handleDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      setIsLoading(false);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    const handleProgress = () => {
      updateBufferProgress();
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration || 0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoRef, onTimeUpdate, updateBufferProgress]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const hideControls = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    hideControls();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handlePlay = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
      return;
    }
    videoRef.current?.play().catch(() => {
      toast.error('Playback failed. Please try again.');
    });
    setIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
    onPause?.();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    const doc = document as any;
    const isFullscreenSupported = !!(
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
    );

    if (!isFullscreenSupported) {
      toast.error('Fullscreen is not supported in your browser');
      return;
    }

    try {
      const container = containerRef.current as any;
      if (!isFullscreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Failed to toggle fullscreen');
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Poster/click-to-play state
  if (!shouldLoad) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer ${className}`}
        onClick={handlePlay}
      >
        {poster && (
          <img
            src={poster}
            alt="Video poster"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/20">
          <Button
            size="lg"
            className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary hover:scale-110 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
          >
            <Play className="h-8 w-8" fill="currentColor" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<VideoPlayerSkeleton />}>
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full"
          playsInline
          preload="auto"
          onEnded={() => {
            if (!live) {
              setIsPlaying(false);
              onEnded?.();
            }
          }}
          onClick={() => (isPlaying ? handlePause() : handlePlay())}
        >
          {/* Subtitle Tracks */}
          {subtitleTracks?.map((track) => (
            <track
              key={track.srcLang}
              kind="subtitles"
              src={track.src}
              srcLang={track.srcLang}
              label={track.label}
              default={track.default}
            />
          ))}
        </video>

        {/* Loading/Buffering overlay */}
        {(isLoading || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <span className="text-sm text-white/80">
                {isLoading ? 'Loading...' : 'Buffering...'}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Gesture Controls */}
        {isMobile && controls && (
          <GestureControls
            videoRef={videoRef}
            onSeek={(seconds) => {
              setSeekIndicator({
                visible: true,
                side: seconds > 0 ? 'right' : 'left',
                type: 'seek',
                value: seconds,
              });
              setTimeout(() => setSeekIndicator(prev => ({ ...prev, visible: false })), 1000);
            }}
            onBrightnessChange={(value) => {
              setSeekIndicator({
                visible: true,
                side: 'left',
                type: 'brightness',
                value,
              });
              setTimeout(() => setSeekIndicator(prev => ({ ...prev, visible: false })), 1000);
            }}
            onVolumeChange={(value) => {
              handleVolumeChange([value / 100]);
              setSeekIndicator({
                visible: true,
                side: 'right',
                type: 'volume',
                value,
              });
              setTimeout(() => setSeekIndicator(prev => ({ ...prev, visible: false })), 1000);
            }}
            showIndicator={(side, type, value) => {
              setSeekIndicator({ visible: true, side, type, value });
              setTimeout(() => setSeekIndicator(prev => ({ ...prev, visible: false })), 1000);
            }}
          />
        )}

        {/* Seek Indicator */}
        <SeekIndicator
          side={seekIndicator.side}
          type={seekIndicator.type}
          value={seekIndicator.value}
          visible={seekIndicator.visible}
        />

        {/* Center play button when paused */}
        {!isPlaying && !isLoading && !isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary pointer-events-auto"
              onClick={handlePlay}
            >
              <Play className="h-8 w-8" fill="currentColor" />
            </Button>
          </div>
        )}

        {/* Controls overlay */}
        {controls && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress bar with buffer indicator */}
            <div className="relative mb-3">
              {/* Buffer progress (background) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/30 rounded-full transition-all duration-300"
                style={{ width: `${bufferedPercent}%` }}
              />

              {/* Seek slider */}
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&>span:first-child_>span]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={isPlaying ? handlePause : handlePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                {/* Volume control */}
                <div className="flex items-center gap-1 group/volume">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/30 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&>span:first-child_>span]:bg-white"
                    />
                  </div>
                </div>

                {/* Time display */}
                <span className="text-white text-sm font-medium ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {}}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Suspense>
  );
}
