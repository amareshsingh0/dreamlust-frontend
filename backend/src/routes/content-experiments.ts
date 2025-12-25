import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/:contentId/experiments', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { variants } = req.body;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const activeExperiment = await prisma.contentExperiment.findFirst({
      where: { contentId, status: 'running' },
    });

    if (activeExperiment) {
      return res.status(400).json({ error: 'An experiment is already running for this content' });
    }

    const experiment = await prisma.contentExperiment.create({
      data: {
        contentId,
        variants: variants.map((v: any) => ({
          ...v,
          metrics: { views: 0, ctr: 0, watchTime: 0, completion: 0 },
        })),
        status: 'running',
      },
    });

    res.json(experiment);
  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

router.get('/:contentId/experiments', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;

    const experiments = await prisma.contentExperiment.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

router.get('/:contentId/experiments/:experimentId', authenticate, async (req, res) => {
  try {
    const { experimentId } = req.params;

    const experiment = await prisma.contentExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(experiment);
  } catch (error) {
    console.error('Error fetching experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
});

router.post('/:contentId/experiments/:experimentId/track', async (req, res) => {
  try {
    const { experimentId } = req.params;
    const { versionId, eventType, value } = req.body;

    const experiment = await prisma.contentExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment || experiment.status !== 'running') {
      return res.status(400).json({ error: 'Experiment not active' });
    }

    const variants = experiment.variants as any[];
    const variantIndex = variants.findIndex((v) => v.versionId === versionId);

    if (variantIndex === -1) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const updatedVariants = [...variants];
    const metrics = updatedVariants[variantIndex].metrics;

    switch (eventType) {
      case 'view':
        metrics.views = (metrics.views || 0) + 1;
        break;
      case 'click':
        metrics.clicks = (metrics.clicks || 0) + 1;
        metrics.ctr = metrics.clicks / metrics.views;
        break;
      case 'watchTime':
        const totalWatchTime = (metrics.watchTime || 0) * (metrics.views - 1) + value;
        metrics.watchTime = totalWatchTime / metrics.views;
        break;
      case 'completion':
        metrics.completions = (metrics.completions || 0) + 1;
        metrics.completion = metrics.completions / metrics.views;
        break;
    }

    updatedVariants[variantIndex].metrics = metrics;

    await prisma.contentExperiment.update({
      where: { id: experimentId },
      data: { variants: updatedVariants },
    });

    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error tracking experiment:', error);
    res.status(500).json({ error: 'Failed to track experiment' });
  }
});

router.post('/:contentId/experiments/:experimentId/complete', authenticate, async (req, res) => {
  try {
    const { contentId, experimentId } = req.params;
    const { winnerVersionId } = req.body;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const experiment = await prisma.contentExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        winnerVersionId,
      },
    });

    if (winnerVersionId) {
      const winnerVersion = await prisma.contentVersion.findUnique({
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
    }

    res.json(experiment);
  } catch (error) {
    console.error('Error completing experiment:', error);
    res.status(500).json({ error: 'Failed to complete experiment' });
  }
});

router.patch('/:contentId/experiments/:experimentId/pause', authenticate, async (req, res) => {
  try {
    const { contentId, experimentId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const experiment = await prisma.contentExperiment.update({
      where: { id: experimentId },
      data: { status: 'paused' },
    });

    res.json(experiment);
  } catch (error) {
    console.error('Error pausing experiment:', error);
    res.status(500).json({ error: 'Failed to pause experiment' });
  }
});

router.patch('/:contentId/experiments/:experimentId/resume', authenticate, async (req, res) => {
  try {
    const { contentId, experimentId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const experiment = await prisma.contentExperiment.update({
      where: { id: experimentId },
      data: { status: 'running' },
    });

    res.json(experiment);
  } catch (error) {
    console.error('Error resuming experiment:', error);
    res.status(500).json({ error: 'Failed to resume experiment' });
  }
});

export default router;
