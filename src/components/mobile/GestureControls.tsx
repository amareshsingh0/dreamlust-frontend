/**
 * Gesture Controls for Mobile Video Player
 * Provides swipe and tap gestures for video control
 */

import { useRef, useState, useEffect, TouchEvent } from 'react';
import { Rewind, FastForward, Sun, Volume2 } from 'lucide-react';

interface GestureControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onSeek?: (seconds: number) => void;
  onBrightnessChange?: (value: number) => void;
  onVolumeChange?: (value: number) => void;
  showIndicator?: (side: 'left' | 'right', type: 'seek' | 'brightness' | 'volume', value: number) => void;
}

export function GestureControls({
  videoRef,
  onSeek,
  onBrightnessChange,
  onVolumeChange,
  showIndicator,
}: GestureControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [lastTap, setLastTap] = useState<{ time: number; x: number; y: number } | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(100);

  const SEEK_DISTANCE = 10; // seconds
  const DOUBLE_TAP_DELAY = 300; // milliseconds
  const SWIPE_THRESHOLD = 50; // pixels

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${brightness}%)`;
    }
  }, [brightness, videoRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume, videoRef]);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart || !videoRef.current || !containerRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Determine which side of screen was touched
    const isLeftSide = touchX < containerWidth / 2;
    const side: 'left' | 'right' = isLeftSide ? 'left' : 'right';

    // Check for double tap (seek)
    if (deltaTime < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      if (lastTap && now - lastTap.time < DOUBLE_TAP_DELAY) {
        // Double tap detected
        const seekDirection = isLeftSide ? -SEEK_DISTANCE : SEEK_DISTANCE;
        const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seekDirection));
        videoRef.current.currentTime = newTime;
        
        if (onSeek) {
          onSeek(seekDirection);
        }
        
        if (showIndicator) {
          showIndicator(side, 'seek', seekDirection);
        }
        
        setLastTap(null);
        return;
      }
      setLastTap({ time: now, x: touchX, y: touchY });
      return;
    }

    // Check for swipe (brightness/volume)
    if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
      const direction: 'up' | 'down' = deltaY < 0 ? 'up' : 'down';
      
      if (isLeftSide) {
        // Brightness control
        const newBrightness = direction === 'up'
          ? Math.min(brightness + 10, 200)
          : Math.max(brightness - 10, 50);
        setBrightness(newBrightness);
        
        if (onBrightnessChange) {
          onBrightnessChange(newBrightness);
        }
        
        if (showIndicator) {
          showIndicator('left', 'brightness', newBrightness);
        }
      } else {
        // Volume control
        const newVolume = direction === 'up'
          ? Math.min(volume + 10, 100)
          : Math.max(volume - 10, 0);
        setVolume(newVolume);
        
        if (onVolumeChange) {
          onVolumeChange(newVolume);
        }
        
        if (showIndicator) {
          showIndicator('right', 'volume', newVolume);
        }
      }
    }

    setTouchStart(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none z-10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    />
  );
}

/**
 * Seek Indicator Component
 * Shows visual feedback for seek actions
 */
interface SeekIndicatorProps {
  side: 'left' | 'right';
  type: 'seek' | 'brightness' | 'volume';
  value: number;
  visible: boolean;
}

export function SeekIndicator({ side, type, value, visible }: SeekIndicatorProps) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'seek':
        return side === 'left' ? <Rewind className="h-8 w-8" /> : <FastForward className="h-8 w-8" />;
      case 'brightness':
        return <Sun className="h-8 w-8" />;
      case 'volume':
        return <Volume2 className="h-8 w-8" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'seek':
        return `${value > 0 ? '+' : ''}${value}s`;
      case 'brightness':
        return `${value}%`;
      case 'volume':
        return `${value}%`;
    }
  };

  return (
    <div
      className={`
        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        bg-black/70 text-white rounded-lg p-4 flex flex-col items-center gap-2
        pointer-events-none z-50 transition-opacity duration-200
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </div>
  );
}

