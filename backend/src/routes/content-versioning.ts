/**
 * Content Versioning & A/B Testing Routes
 * Handles version management and experiments
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/cache/cacheManager';
import { s3Storage } from '../lib/storage/s3Storage';

const router = Router();

/**
 * Get version history for content
 */
router.get('/:contentId/versions', async (req, res) => {
  try {
    const { contentId } = req.params;

    const versions = await cache.getOrSet(
      `content:${contentId}:versions`,
      async () => {
        return await prisma.contentVersion.findMany({
          where: { contentId },
          orderBy: { version: 'desc' },
        });
      },
      { ttl: 300, tags: [`content:${contentId}`] }
    );

    res.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * Create new version
 */
router.post('/:contentId/versions', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { videoUrl, thumbnailUrl, title, description, changes } = req.body;

    // Get latest version number
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { contentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    const version = await prisma.contentVersion.create({
      data: {
        contentId,
        version: newVersion,
        videoUrl,
        thumbnailUrl,
        title,
        description,
        changes,
        isPublished: false,
      },
    });

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.status(201).json({ version });
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

/**
 * Publish a version
 */
router.post('/:contentId/versions/:versionId/publish', async (req, res) => {
  try {
    const { contentId, versionId } = req.params;

    // Unpublish all other versions
    await prisma.contentVersion.updateMany({
      where: { contentId, isPublished: true },
      data: { isPublished: false },
    });

    // Publish this version
    const version = await prisma.contentVersion.update({
      where: { id: versionId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Update main content
    await prisma.content.update({
      where: { id: contentId },
      data: {
        mediaUrl: version.videoUrl,
        thumbnail: version.thumbnailUrl,
        title: version.title,
        description: version.description,
      },
    });

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.json({ version });
  } catch (error) {
    console.error('Error publishing version:', error);
    res.status(500).json({ error: 'Failed to publish version' });
  }
});

/**
 * Start A/B test
 */
router.post('/:contentId/experiments', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { variants } = req.body; // [{versionId, weight}]

    // Validate weights sum to 100
    const totalWeight = variants.reduce((sum: number, v: any) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ error: 'Variant weights must sum to 100' });
    }

    // Initialize metrics for each variant
    const variantsWithMetrics = variants.map((v: any) => ({
      ...v,
      metrics: {
        views: 0,
        ctr: 0,
        watchTime: 0,
        completion: 0,
      },
    }));

    const experiment = await prisma.contentExperiment.create({
      data: {
        contentId,
        variants: variantsWithMetrics,
        status: 'running',
      },
    });

    res.status(201).json({ experiment });
  } catch (error) {
    console.error('Error starting experiment:', error);
    res.status(500).json({ error: 'Failed to start experiment' });
  }
});

/**
 * Get experiment results
 */
router.get('/:contentId/experiments/active', async (req, res) => {
  try {
    const { contentId } = req.params;

    const experiment = await prisma.contentExperiment.findFirst({
      where: {
        contentId,
        status: 'running',
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'No active experiment found' });
    }

    res.json({ experiment });
  } catch (error) {
    console.error('Error fetching experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
});

/**
 * Record experiment view
 */
router.post('/:contentId/experiments/track', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { versionId, event, value } = req.body; // event: view, click, watch_time, completion

    const experiment = await prisma.contentExperiment.findFirst({
      where: {
        contentId,
        status: 'running',
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'No active experiment' });
    }

    // Update variant metrics
    const variants = experiment.variants as any[];
    const variantIndex = variants.findIndex((v: any) => v.versionId === versionId);

    if (variantIndex === -1) {
      return res.status(400).json({ error: 'Invalid version ID' });
    }

    const variant = variants[variantIndex];

    switch (event) {
      case 'view':
        variant.metrics.views += 1;
        break;
      case 'click':
        variant.metrics.views += 1;
        variant.metrics.ctr = (variant.metrics.ctr * (variant.metrics.views - 1) + 1) / variant.metrics.views;
        break;
      case 'watch_time':
        variant.metrics.watchTime = (variant.metrics.watchTime * (variant.metrics.views - 1) + value) / variant.metrics.views;
        break;
      case 'completion':
        variant.metrics.completion = (variant.metrics.completion * (variant.metrics.views - 1) + (value ? 1 : 0)) / variant.metrics.views;
        break;
    }

    await prisma.contentExperiment.update({
      where: { id: experiment.id },
      data: { variants },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking experiment:', error);
    res.status(500).json({ error: 'Failed to track experiment' });
  }
});

/**
 * Declare winner and end experiment
 */
router.post('/:contentId/experiments/:experimentId/declare-winner', async (req, res) => {
  try {
    const { contentId, experimentId } = req.params;
    const { winnerVersionId } = req.body;

    // Update experiment
    const experiment = await prisma.contentExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        winnerVersionId,
      },
    });

    // Publish winner version
    const winnerVersion = await prisma.contentVersion.findFirst({
      where: { id: winnerVersionId },
    });

    if (winnerVersion) {
      await prisma.contentVersion.updateMany({
        where: { contentId, isPublished: true },
        data: { isPublished: false },
      });

      await prisma.contentVersion.update({
        where: { id: winnerVersionId },
        data: {
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      await prisma.content.update({
        where: { id: contentId },
        data: {
          mediaUrl: winnerVersion.videoUrl,
          thumbnail: winnerVersion.thumbnailUrl,
          title: winnerVersion.title,
          description: winnerVersion.description,
        },
      });
    }

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.json({ experiment });
  } catch (error) {
    console.error('Error declaring winner:', error);
    res.status(500).json({ error: 'Failed to declare winner' });
  }
});

/**
 * Get variant for user (A/B test assignment)
 */
router.get('/:contentId/variant', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.query.userId as string;

    const experiment = await prisma.contentExperiment.findFirst({
      where: {
        contentId,
        status: 'running',
      },
    });

    if (!experiment) {
      // No experiment, return published version
      const publishedVersion = await prisma.contentVersion.findFirst({
        where: { contentId, isPublished: true },
      });
      return res.json({ version: publishedVersion });
    }

    // Assign variant based on user ID hash
    const variants = experiment.variants as any[];
    const hash = userId ? hashString(userId) : Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.weight;
      if (hash < cumulative) {
        const version = await prisma.contentVersion.findFirst({
          where: { id: variant.versionId },
        });
        return res.json({ version, variantId: variant.versionId });
      }
    }

    // Fallback to first variant
    const version = await prisma.contentVersion.findFirst({
      where: { id: variants[0].versionId },
    });
    res.json({ version, variantId: variants[0].versionId });
  } catch (error) {
    console.error('Error getting variant:', error);
    res.status(500).json({ error: 'Failed to get variant' });
  }
});

// Helper function to hash string to number 0-100
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}

export default router;
