/**
 * Social Sharing Service
 * Handles Open Graph tags and social sharing
 */

import { prisma } from '../prisma';
import { env } from '../../config/env';

export interface OGTags {
  'og:title': string;
  'og:description': string;
  'og:image': string;
  'og:url': string;
  'og:type': string;
  'og:video'?: string;
  'og:video:width'?: string;
  'og:video:height'?: string;
  'twitter:card'?: string;
  'twitter:player'?: string;
  'twitter:title'?: string;
  'twitter:description'?: string;
  'twitter:image'?: string;
}

/**
 * Generate Open Graph tags for content
 */
export async function generateOGTags(contentId: string): Promise<OGTags> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        select: {
          display_name: true,
          handle: true,
        },
      },
    },
  });

  if (!content) {
    throw new Error('Content not found');
  }

  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const shareUrl = `${frontendUrl}/watch/${contentId}`;
  const embedUrl = `${frontendUrl}/embed/${contentId}`;

  const ogTags: OGTags = {
    'og:title': content.title,
    'og:description': content.description || `${content.creator.display_name} on DreamLust`,
    'og:image': content.thumbnail || '',
    'og:url': shareUrl,
    'og:type': 'video.other',
    'twitter:card': 'player',
    'twitter:player': embedUrl,
    'twitter:title': content.title,
    'twitter:description': content.description || `${content.creator.display_name} on DreamLust`,
    'twitter:image': content.thumbnail || '',
  };

  if (content.mediaUrl) {
    ogTags['og:video'] = content.mediaUrl;
    ogTags['og:video:width'] = '1280';
    ogTags['og:video:height'] = '720';
  }

  return ogTags;
}

/**
 * Generate share URL for content
 */
export function generateShareUrl(contentId: string, platform?: string): string {
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const baseUrl = `${frontendUrl}/watch/${contentId}`;

  if (!platform) {
    return baseUrl;
  }

  const encodedUrl = encodeURIComponent(baseUrl);
  
  switch (platform.toLowerCase()) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'reddit':
      return `https://reddit.com/submit?url=${encodedUrl}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}`;
    default:
      return baseUrl;
  }
}

/**
 * Generate embed code for content
 */
export function generateEmbedCode(contentId: string): string {
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const embedUrl = `${frontendUrl}/embed/${contentId}`;
  
  return `<iframe src="${embedUrl}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
}

/**
 * Track share event
 */
export async function trackShare(contentId: string, userId: string | null, platform?: string) {
  // Increment share count
  await prisma.content.update({
    where: { id: contentId },
    data: {
      shareCount: {
        increment: 1,
      },
    },
  });

  // Log share event (could be stored in analytics)
  // For now, just increment the counter
}

