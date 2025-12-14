/**
 * Image Optimization Utilities
 * For generating blur placeholders and optimizing images
 */

/**
 * Generate a blur placeholder from an image URL
 * Uses a simple base64-encoded SVG as placeholder
 * For production, consider using a service like Cloudinary or Imgix
 */
export async function generateBlurPlaceholder(
  imageUrl: string,
  width: number = 20,
  height: number = 20
): Promise<string> {
  try {
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Create canvas for downscaling
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Draw scaled image
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.1);
    return base64;
  } catch (error) {
    console.error('Error generating blur placeholder:', error);
    // Return a simple gray placeholder
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#737373"/>
      </svg>`
    )}`;
  }
}

/**
 * Generate a simple blur hash placeholder
 * Returns a base64-encoded low-quality image
 */
export function createSimpleBlurPlaceholder(width: number = 10, height: number = 10): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#737373;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#525252;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get optimized image URL
 * In production, this would use a CDN or image optimization service
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string {
  const { width, height, quality = 85, format = 'webp' } = options;

  // If using a CDN like Cloudinary, Imgix, or similar, construct the URL here
  // Example: return `${CDN_BASE_URL}/${originalUrl}?w=${width}&h=${height}&q=${quality}&f=${format}`;

  // For now, return original URL
  // In production, integrate with your image CDN
  return originalUrl;
}

/**
 * Preload image for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if image is in viewport (for lazy loading)
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

