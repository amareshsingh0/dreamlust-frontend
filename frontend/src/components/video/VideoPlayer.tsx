import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayerSkeleton } from './VideoPlayerSkeleton';
import { loadVideoPlayerLibrary, preconnectVideoCDN, getHLSManifestUrl } from '@/lib/videoUtils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

/**
 * Optimized Video Player Component
 * Features:
 * - Lazy loads video player library
 * - HLS adaptive streaming support
 * - Preconnects to video CDN
 * - Lazy loads video until user clicks play
 */
export function VideoPlayer({
  src,
  poster,
  autoplay = false,
  controls = true,
  className,
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(autoplay);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preconnect to video CDN on mount
  useEffect(() => {
    if (src) {
      const cdnUrl = new URL(src).origin;
      preconnectVideoCDN(cdnUrl);
    }
  }, [src]);

  // Lazy load video player library when needed
  useEffect(() => {
    if (shouldLoad) {
      loadVideoPlayerLibrary().then(() => {
        setIsLoading(false);
      });
    }
  }, [shouldLoad]);

  const handlePlay = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
    videoRef.current?.play();
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Use HLS if available
  const videoSrc = src.endsWith('.m3u8') ? src : getHLSManifestUrl(src);

  if (!shouldLoad) {
    return (
      <div 
        ref={containerRef}
        className={`relative w-full aspect-video bg-muted rounded-lg overflow-hidden ${className}`}
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
            className="w-16 h-16 rounded-full"
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
        className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden ${className}`}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          className="w-full h-full"
          onLoadedData={() => setIsLoading(false)}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          playsInline
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        )}

        {/* Controls overlay */}
        {controls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isPlaying ? handlePause : handlePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {}}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
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

