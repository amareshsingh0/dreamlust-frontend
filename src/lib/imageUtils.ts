/**
 * Image utility functions for optimization
 */

/**
 * Convert Unsplash URL to optimized format with proper dimensions
 * @param url - Original Unsplash URL
 * @param width - Desired width
 * @param height - Optional height
 * @returns Optimized URL
 */
export function optimizeUnsplashUrl(url: string, width: number, height?: number): string {
  if (!url.includes('unsplash.com')) return url;
  
  // Remove existing query params
  const baseUrl = url.split('?')[0];
  
  // Build optimized query string
  const params = new URLSearchParams();
  params.set('w', width.toString());
  if (height) {
    params.set('h', height.toString());
    params.set('fit', 'crop');
  }
  params.set('auto', 'format'); // Enable automatic format (WebP/AVIF)
  params.set('q', '80'); // Quality 80 for good balance
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Create a simple blur placeholder
 */
export function createSimpleBlurPlaceholder(): string {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzczNzM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';
}
