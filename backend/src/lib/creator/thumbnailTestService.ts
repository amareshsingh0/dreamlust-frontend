/**
 * Thumbnail A/B Testing Service
 * Tests different thumbnails to determine which performs best
 */

import { prisma } from '../prisma';
import logger from '../logger';

export interface ThumbnailVariant {
  url: string;
  impressions: number;
  clicks: number;
}

export interface CreateThumbnailTestInput {
  contentId: string;
  variants: Array<{ url: string }>;
}

/**
 * Create or update thumbnail test
 */
export async function createThumbnailTest(input: CreateThumbnailTestInput) {
  const variants: ThumbnailVariant[] = input.variants.map(v => ({
    url: v.url,
    impressions: 0,
    clicks: 0,
  }));

  const test = await prisma.thumbnailTest.upsert({
    where: { contentId: input.contentId },
    create: {
      contentId: input.contentId,
      variants: variants as any,
      status: 'running',
    },
    update: {
      variants: variants as any,
      status: 'running',
      startedAt: new Date(),
      endedAt: null,
      winner: null,
    },
  });

  logger.info('Thumbnail test created', { contentId: input.contentId, variantCount: variants.length });

  return test;
}

/**
 * Get thumbnail for content (with A/B testing)
 */
export async function getThumbnail(contentId: string, userId: string): Promise<string> {
  const test = await prisma.thumbnailTest.findUnique({
    where: { contentId },
  });

  // If no test or test is not running, return default thumbnail
  if (!test || test.status !== 'running') {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { thumbnail: true },
    });
    return content?.thumbnail || '';
  }

  // Assign variant based on user hash (consistent assignment)
  const variantIndex = hashCode(userId + contentId) % (test.variants as ThumbnailVariant[]).length;
  const variant = (test.variants as ThumbnailVariant[])[variantIndex];

  // Track impression
  await trackThumbnailImpression(contentId, variant.url);

  return variant.url;
}

/**
 * Track thumbnail impression
 */
export async function trackThumbnailImpression(contentId: string, thumbnailUrl: string) {
  const test = await prisma.thumbnailTest.findUnique({
    where: { contentId },
  });

  if (!test || test.status !== 'running') {
    return;
  }

  const variants = test.variants as ThumbnailVariant[];
  const variantIndex = variants.findIndex(v => v.url === thumbnailUrl);

  if (variantIndex === -1) {
    return;
  }

  variants[variantIndex].impressions++;

  await prisma.thumbnailTest.update({
    where: { contentId },
    data: { variants: variants as any },
  });

  // Check if we should determine winner
  const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
  if (totalImpressions >= 1000) {
    await determineThumbnailWinner(contentId);
  }
}

/**
 * Track thumbnail click
 */
export async function trackThumbnailClick(contentId: string, thumbnailUrl: string) {
  const test = await prisma.thumbnailTest.findUnique({
    where: { contentId },
  });

  if (!test || test.status !== 'running') {
    return;
  }

  const variants = test.variants as ThumbnailVariant[];
  const variantIndex = variants.findIndex(v => v.url === thumbnailUrl);

  if (variantIndex === -1) {
    return;
  }

  variants[variantIndex].clicks++;

  await prisma.thumbnailTest.update({
    where: { contentId },
    data: { variants: variants as any },
  });

  // Check if we should determine winner
  const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
  if (totalImpressions >= 1000) {
    await determineThumbnailWinner(contentId);
  }
}

/**
 * Determine thumbnail winner based on CTR
 */
export async function determineThumbnailWinner(contentId: string) {
  const test = await prisma.thumbnailTest.findUnique({
    where: { contentId },
  });

  if (!test || test.status !== 'running') {
    return;
  }

  const variants = test.variants as ThumbnailVariant[];
  const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);

  if (totalImpressions < 1000) {
    return; // Not enough data yet
  }

  // Calculate CTR for each variant
  const winner = variants.reduce((best, current) => {
    const currentCTR = current.impressions > 0 ? current.clicks / current.impressions : 0;
    const bestCTR = best.impressions > 0 ? best.clicks / best.impressions : 0;
    return currentCTR > bestCTR ? current : best;
  });

  // Update test with winner
  await prisma.thumbnailTest.update({
    where: { contentId },
    data: {
      status: 'completed',
      winner: winner.url,
      endedAt: new Date(),
    },
  });

  // Update content with winning thumbnail
  await prisma.content.update({
    where: { id: contentId },
    data: { thumbnail: winner.url },
  });

  logger.info('Thumbnail test completed', {
    contentId,
    winner: winner.url,
    winnerCTR: winner.impressions > 0 ? winner.clicks / winner.impressions : 0,
  });
}

/**
 * Simple hash function for consistent user assignment
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

