import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { optimizeUnsplashUrl } from '@/lib/imageUtils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  blurDataURL?: string;
  className?: string;
  priority?: boolean; // For above-the-fold images
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  fill?: boolean; // When true, image fills parent container (don't apply fixed dimensions)
}

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading (except for priority images)
 * - Blur placeholder support
 * - Error handling with fallback
 * - Responsive sizing
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 85,
  blurDataURL,
  className,
  priority = false,
  objectFit = 'cover',
  fill = true, // Default to fill parent container
  ...props
}: OptimizedImageProps) {
  // Optimize image URL with proper dimensions and format
  const optimizedSrc = width && src.includes('unsplash.com') 
    ? optimizeUnsplashUrl(src, width, height) 
    : src;
  
  const [imageSrc, setImageSrc] = useState<string>(blurDataURL || optimizedSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Preload the actual image
    const img = new Image();
    img.src = optimizedSrc;
    img.onload = () => {
      setImageSrc(optimizedSrc);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
    };
  }, [optimizedSrc]);

  // Fallback image
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzczNzM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';

  // When fill is true, don't apply fixed dimensions - let parent control size
  const containerStyle = fill ? undefined : { width, height };

  return (
    <div
      className={cn('relative overflow-hidden w-full h-full', className)}
      style={containerStyle}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full',
            'transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        src={hasError ? fallbackSrc : imageSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          hasError && 'opacity-100'
        )}
        style={{ objectFit }}
        width={fill ? undefined : (width || undefined)}
        height={fill ? undefined : (height || undefined)}
        {...props}
      />

      {/* Loading skeleton */}
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}

