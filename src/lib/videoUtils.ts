/**
 * Video Optimization Utilities
 * For HLS streaming, thumbnail generation, and video optimization
 */

/**
 * Generate video thumbnail URL
 * Extracts frame at specified time (default: 0s for poster)
 */
export function getVideoThumbnail(
  videoUrl: string,
  _time: number = 0
): string {
  // If using a video CDN (like Cloudinary, Mux, etc.), construct thumbnail URL
  // Example: `${CDN_BASE_URL}/${videoUrl}/thumbnail.jpg?time=${time}`
  
  // For local videos or direct URLs, you might need to:
  // 1. Use a service to generate thumbnails on upload
  // 2. Store thumbnail URLs in the database
  // 3. Use video poster attribute
  
  return videoUrl.replace(/\.(mp4|webm|mov)$/i, '_thumbnail.jpg');
}

/**
 * Generate HLS manifest URL
 * For adaptive streaming with multiple quality levels
 */
export function getHLSManifestUrl(videoUrl: string): string {
  // Convert video URL to HLS manifest
  // Example: video.mp4 -> video.m3u8
  return videoUrl.replace(/\.(mp4|webm|mov)$/i, '.m3u8');
}

/**
 * Get video quality options for HLS
 */
export function getVideoQualityOptions(_videoId: string): Array<{
  label: string;
  value: string;
  resolution: string;
}> {
  // In production, fetch available qualities from your video CDN
  return [
    { label: 'Auto', value: 'auto', resolution: 'Auto' },
    { label: '1080p', value: '1080p', resolution: '1920x1080' },
    { label: '720p', value: '720p', resolution: '1280x720' },
    { label: '480p', value: '480p', resolution: '854x480' },
    { label: '360p', value: '360p', resolution: '640x360' },
  ];
}

/**
 * Preconnect to video CDN for faster loading
 */
export function preconnectVideoCDN(cdnUrl: string): void {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = cdnUrl;
  document.head.appendChild(link);

  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = cdnUrl;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
}

/**
 * Lazy load video player library
 * Only loads when user clicks play
 */
export async function loadVideoPlayerLibrary(): Promise<any> {
  // Dynamic import of video player library (e.g., video.js, hls.js, etc.)
  // This reduces initial bundle size
  try {
    // Example with video.js (install if needed: bun add video.js)
    // const videojs = await import('video.js');
    // return videojs.default;
    
    // For now, return a placeholder
    // In production, import your actual video player library
    return null;
  } catch (error) {
    console.error('Failed to load video player library:', error);
    return null;
  }
}

/**
 * Generate preview sprite (thumbnail grid) for video scrubbing
 */
export function getPreviewSpriteUrl(videoUrl: string, _spriteCount: number = 10): string {
  // Generate URL for preview sprite image
  // This shows thumbnails when hovering over the progress bar
  // Example: `${CDN_BASE_URL}/${videoUrl}/sprite.jpg?vtt=${videoUrl}/sprite.vtt`
  return videoUrl.replace(/\.(mp4|webm|mov)$/i, '_sprite.jpg');
}

/**
 * Check if browser supports HLS
 */
export function supportsHLS(): boolean {
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/**
 * Check if browser supports adaptive bitrate streaming
 */
export function supportsAdaptiveStreaming(): boolean {
  return supportsHLS() || typeof (window as any).MediaSource !== 'undefined';
}

