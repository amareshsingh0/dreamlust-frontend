import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireCreator } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { ValidationError, NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { processThumbnailFromBuffer, generateVideoThumbnail } from '../lib/imageProcessing';
import { autoFlagContent } from '../lib/moderation/autoModeration';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

const createContentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['video', 'live', 'vr']),
  isPublic: z.boolean().default(true),
  isNSFW: z.boolean().default(false),
  ageRestricted: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  allowDownloads: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  price: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

/**
 * POST /api/upload/content
 * Upload content with thumbnail and media file
 * Generates blur placeholder for thumbnail automatically
 */
router.post(
  '/content',
  authenticate,
  requireCreator,
  userRateLimiter,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media', maxCount: 1 },
  ]),
  validateBody(createContentSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const {
      title,
      description,
      type,
      isPublic,
      isNSFW,
      ageRestricted,
      allowComments,
      allowDownloads,
      isPremium,
      price,
      tags,
      categories,
    } = req.body;

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Validate files
    if (!files.media || files.media.length === 0) {
      throw new ValidationError('Media file is required');
    }

    const mediaFile = files.media[0];
    const thumbnailFile = files.thumbnail?.[0];

    // TODO: Upload files to storage (S3, Cloudinary, etc.)
    // For now, we'll use placeholder URLs
    const mediaUrl = `https://storage.example.com/${uuidv4()}-${mediaFile.originalname}`;
    let thumbnailUrl: string | null = null;
    let thumbnailBlur: string | null = null;

    // Process thumbnail if provided
    if (thumbnailFile) {
      // Upload thumbnail to storage
      thumbnailUrl = `https://storage.example.com/${uuidv4()}-${thumbnailFile.originalname}`;
      
      // Generate blur placeholder from thumbnail
      const { blurPlaceholder } = await processThumbnailFromBuffer(
        '', // Will be set after content creation
        thumbnailFile.buffer
      );
      thumbnailBlur = blurPlaceholder;
    } else if (mediaFile.mimetype.startsWith('video/')) {
      // Generate thumbnail from video (first frame)
      try {
        const videoThumbnail = await generateVideoThumbnail(mediaFile.buffer, 0);
        // Upload video thumbnail to storage
        thumbnailUrl = `https://storage.example.com/${uuidv4()}-thumbnail.jpg`;
        
        // Generate blur placeholder from video thumbnail
        const { blurPlaceholder } = await processThumbnailFromBuffer(
          '',
          videoThumbnail
        );
        thumbnailBlur = blurPlaceholder;
      } catch (error) {
        console.error('Error generating video thumbnail:', error);
        // Continue without thumbnail
      }
    }

    // Create content
    const content = await prisma.content.create({
      data: {
        creatorId: creator.id,
        title,
        description,
        type: type as 'video' | 'live' | 'vr',
        status: 'PUBLISHED',
        thumbnail: thumbnailUrl,
        thumbnailBlur,
        mediaUrl,
        mediaType: mediaFile.mimetype,
        fileSize: BigInt(mediaFile.size),
        isPublic,
        isNSFW,
        ageRestricted,
        allowComments,
        allowDownloads,
        isPremium,
        price: price ? parseFloat(price.toString()) : null,
        publishedAt: new Date(),
      },
    });

    // Update thumbnail blur with content ID (if not already set)
    if (thumbnailBlur && !content.thumbnailBlur) {
      await prisma.content.update({
        where: { id: content.id },
        data: { thumbnailBlur },
      });
    }

    // Process tags
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });

        await prisma.contentTag.create({
          data: {
            contentId: content.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Process categories
    if (categories && Array.isArray(categories)) {
      for (const categoryName of categories) {
        const category = await prisma.category.upsert({
          where: { slug: categoryName },
          update: {},
          create: {
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
          },
        });

        await prisma.contentCategory.create({
          data: {
            contentId: content.id,
            categoryId: category.id,
          },
        });
      }
    }

    // Auto-moderation: Check content and flag if needed
    const moderationResult = await autoFlagContent(
      content.id,
      creator.id,
      thumbnailUrl || undefined
    );

    res.json({
      success: true,
      message: 'Content uploaded successfully',
      data: {
        content: {
          ...content,
          flagged: moderationResult.flagged,
          flags: moderationResult.flags,
        },
      },
    });
  }
);

/**
 * POST /api/upload/thumbnail
 * Upload and process thumbnail separately (for existing content)
 */
router.post(
  '/thumbnail/:contentId',
  authenticate,
  requireCreator,
  userRateLimiter,
  upload.single('thumbnail'),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contentId } = req.params;
    const file = req.file;

    if (!file) {
      throw new ValidationError('Thumbnail file is required');
    }

    // Verify content ownership
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.creatorId !== creator.id) {
      throw new NotFoundError('Content not found or access denied');
    }

    // Upload thumbnail to storage
    const thumbnailUrl = `https://storage.example.com/${uuidv4()}-${file.originalname}`;

    // Generate blur placeholder
    const { blurPlaceholder } = await processThumbnailFromBuffer(
      contentId,
      file.buffer
    );

    // Update content
    await prisma.content.update({
      where: { id: contentId },
      data: {
        thumbnail: thumbnailUrl,
        thumbnailBlur: blurPlaceholder,
      },
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded and processed',
      data: {
        thumbnail: thumbnailUrl,
        thumbnailBlur: blurPlaceholder,
      },
    });
  }
);

export default router;

