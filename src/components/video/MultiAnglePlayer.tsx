/**
 * Multi-Angle Video Player Component
 * Supports multiple camera angles with switching and split-screen mode
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3x3, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Angle {
  name: string;
  url: string;
  syncOffset?: number;
}

interface MultiAnglePlayerProps {
  contentId: string;
  mainAngle: string;
  alternateAngles: Angle[];
  allowSwitching?: boolean;
  className?: string;
  autoplay?: boolean;
}

export function MultiAnglePlayer({
  contentId: _contentId,
  mainAngle,
  alternateAngles,
  allowSwitching = true,
  className,
  autoplay = false,
}: MultiAnglePlayerProps) {
  const [currentAngle, setCurrentAngle] = useState<Angle>({ name: 'Main', url: mainAngle });
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [_currentTime, setCurrentTime] = useState(0);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const alternateVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // All angles including main
  const allAngles: Angle[] = [
    { name: 'Main', url: mainAngle, syncOffset: 0 },
    ...alternateAngles,
  ];

  // Sync alternate angles with main video
  useEffect(() => {
    const mainVideo = mainVideoRef.current;
    if (!mainVideo) return;

    const handleTimeUpdate = () => {
      const time = mainVideo.currentTime;
      setCurrentTime(time);

      // Sync all alternate angle videos
      alternateVideoRefs.current.forEach((video, angleName) => {
        if (video && video !== mainVideo) {
          const angle = allAngles.find(a => a.name === angleName);
          if (angle) {
            const syncTime = time + (angle.syncOffset || 0);
            if (Math.abs(video.currentTime - syncTime) > 0.5) {
              video.currentTime = syncTime;
            }
          }
        }
      });
    };

    mainVideo.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [allAngles]);

  // Handle play/pause sync
  useEffect(() => {
    const mainVideo = mainVideoRef.current;
    if (!mainVideo) return;

    if (isPlaying) {
      mainVideo.play().catch(console.error);
      alternateVideoRefs.current.forEach(video => {
        if (video && video !== mainVideo) {
          video.play().catch(console.error);
        }
      });
    } else {
      mainVideo.pause();
      alternateVideoRefs.current.forEach(video => {
        if (video && video !== mainVideo) {
          video.pause();
        }
      });
    }
  }, [isPlaying]);

  const switchAngle = (angle: Angle) => {
    if (!allowSwitching) return;

    // Pause current main video
    if (mainVideoRef.current) {
      const currentTime = mainVideoRef.current.currentTime;
      mainVideoRef.current.pause();
      
      // Switch to new angle
      setCurrentAngle(angle);
      
      // Update main video ref to new angle
      setTimeout(() => {
        const newMainVideo = mainVideoRef.current;
        if (newMainVideo) {
          newMainVideo.currentTime = currentTime - (angle.syncOffset || 0);
          if (isPlaying) {
            newMainVideo.play().catch(console.error);
          }
        }
      }, 100);
    }
  };

  const enableSplitScreen = () => {
    setIsSplitScreen(!isSplitScreen);
  };

  const setVideoRef = (angleName: string) => (ref: HTMLVideoElement | null) => {
    if (ref) {
      alternateVideoRefs.current.set(angleName, ref);
    } else {
      alternateVideoRefs.current.delete(angleName);
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Main Video View */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
        <video
          ref={mainVideoRef}
          src={currentAngle.url}
          className="w-full h-full object-cover"
          controls={false}
          playsInline
          muted={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />

        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-primary-foreground" />
            ) : (
              <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
            )}
          </Button>
        </div>

        {/* Split Screen Mode - Show multiple angles */}
        {isSplitScreen && (
          <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2">
            {allAngles.slice(0, 4).map((angle) => (
              <div
                key={angle.name}
                className={cn(
                  'relative rounded-lg overflow-hidden border-2',
                  currentAngle.name === angle.name
                    ? 'border-primary'
                    : 'border-transparent'
                )}
              >
                <video
                  ref={setVideoRef(angle.name)}
                  src={angle.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {angle.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Angle Switcher */}
      {allowSwitching && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">Camera Angles</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={enableSplitScreen}
              className="gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              {isSplitScreen ? 'Exit Split Screen' : 'Split Screen Mode'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allAngles.map((angle) => (
              <button
                key={angle.name}
                onClick={() => switchAngle(angle)}
                className={cn(
                  'relative aspect-video rounded-lg overflow-hidden border-2 transition-all',
                  currentAngle.name === angle.name
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <video
                  ref={setVideoRef(angle.name)}
                  src={angle.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <label className="text-white text-sm font-medium">{angle.name}</label>
                </div>
                {currentAngle.name === angle.name && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Active
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

