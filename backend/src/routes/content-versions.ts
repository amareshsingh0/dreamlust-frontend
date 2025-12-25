import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/:contentId/versions', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { videoUrl, thumbnailUrl, title, description, changes } = req.body;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const latestVersion = await prisma.contentVersion.findFirst({
      where: { contentId },
      orderBy: { version: 'desc' },
    });

    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    const version = await prisma.contentVersion.create({
      data: {
        contentId,
        version: newVersion,
        videoUrl,
        thumbnailUrl,
        title,
        description,
        changes,
      },
    });

    res.json(version);
  } catch (error) {
    console.error('Error creating content version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

router.get('/:contentId/versions', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;

    const versions = await prisma.contentVersion.findMany({
      where: { contentId },
      orderBy: { version: 'desc' },
    });

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

router.get('/:contentId/versions/:versionId', authenticate, async (req, res) => {
  try {
    const { versionId } = req.params;

    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

router.post('/:contentId/versions/:versionId/publish', authenticate, async (req, res) => {
  try {
    const { contentId, versionId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.contentVersion.updateMany({
      where: { contentId, isPublished: true },
      data: { isPublished: false },
    });

    const version = await prisma.contentVersion.update({
      where: { id: versionId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await prisma.content.update({
      where: { id: contentId },
      data: {
        mediaUrl: version.videoUrl,
        thumbnail: version.thumbnailUrl,
        title: version.title,
        description: version.description,
      },
    });

    res.json(version);
  } catch (error) {
    console.error('Error publishing version:', error);
    res.status(500).json({ error: 'Failed to publish version' });
  }
});

router.delete('/:contentId/versions/:versionId', authenticate, async (req, res) => {
  try {
    const { contentId, versionId } = req.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    });

    if (version?.isPublished) {
      return res.status(400).json({ error: 'Cannot delete published version' });
    }

    await prisma.contentVersion.delete({
      where: { id: versionId },
    });

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

export default router;
