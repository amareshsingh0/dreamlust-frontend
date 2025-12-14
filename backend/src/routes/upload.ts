import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { ValidationError, NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { processThumbnailFromBuffer, generateVideoThumbnail } from '../lib/imageProcessing';
import { autoFlagContent } from '../lib/moderation/autoModeration';
import { invalidateSearchCache, invalidateHomepageCache } from '../lib/cache/contentCache';
import { s3Storage } from '../lib/storage/s3Storage';
import { videoStorage } from '../lib/storage/videoStorage';
import {
  queueVideoTranscoding,
  queueThumbnailGeneration,
  queueNotification,
} from '../lib/queues/queueManager';
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
  async (req: Request, res: Response) => {
    try {
    const userId = req.user!.userId;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('📤 Upload request received:', {
      hasFiles: !!files,
      fileFields: files ? Object.keys(files) : [],
      bodyKeys: Object.keys(req.body),
    });
    
    // Parse form-data fields (they come as strings, need to convert)
    const parseFormData = (body: any) => {
      return {
        title: body.title,
        description: body.description || undefined,
        type: body.type,
        isPublic: body.isPublic === 'true' || body.isPublic === true,
        isNSFW: body.isNSFW === 'true' || body.isNSFW === true,
        ageRestricted: body.ageRestricted === 'true' || body.ageRestricted === true,
        allowComments: body.allowComments !== 'false' && body.allowComments !== false,
        allowDownloads: body.allowDownloads === 'true' || body.allowDownloads === true,
        isPremium: body.isPremium === 'true' || body.isPremium === true,
        price: body.price ? parseFloat(body.price) : undefined,
        tags: body.tags ? (Array.isArray(body.tags) ? body.tags : JSON.parse(body.tags || '[]')) : undefined,
        categories: body.categories ? (Array.isArray(body.categories) ? body.categories : JSON.parse(body.categories || '[]')) : undefined,
      };
    };

    const parsedBody = parseFormData(req.body);
    
    // Validate parsed body
    const validatedData = createContentSchema.parse(parsedBody);
    
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
    } = validatedData;

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

    // Upload media file to storage
    let mediaUrl: string;
    let thumbnailUrl: string | null = null;
    let thumbnailBlur: string | null = null;
    const isVideo = mediaFile.mimetype.startsWith('video/');

    if (isVideo) {
      // For videos, first upload to R2 as temporary storage, then to Mux/Cloudflare Stream
      // Mux requires a URL, not a direct buffer upload
      const tempVideoResult = await s3Storage.uploadVideo(
        mediaFile.buffer,
        mediaFile.originalname,
        'temp-videos'
      );
      const tempVideoUrl = tempVideoResult.cdnUrl || tempVideoResult.url;
      
      // Upload video to video storage service (Cloudflare Stream/Mux)
      const videoResult = await videoStorage.uploadVideo(tempVideoUrl, {
        title,
        description: description || undefined,
      });
      mediaUrl = videoResult.url;
    } else {
      // Upload image to S3/R2
      const imageResult = await s3Storage.uploadImage(
        mediaFile.buffer,
        mediaFile.originalname,
        'content'
      );
      mediaUrl = imageResult.cdnUrl || imageResult.url;
    }

    // Process thumbnail if provided
    if (thumbnailFile) {
      // Upload thumbnail to S3/R2
      const thumbnailResult = await s3Storage.uploadImage(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
        'thumbnails'
      );
      thumbnailUrl = thumbnailResult.cdnUrl || thumbnailResult.url;
      
      // Generate blur placeholder from thumbnail
      const { blurPlaceholder } = await processThumbnailFromBuffer(
        '', // Will be set after content creation
        thumbnailFile.buffer
      );
      thumbnailBlur = blurPlaceholder;
    }

    // Create content
    const content = await prisma.content.create({
      data: {
        creatorId: creator.id,
        title,
        description,
        type: type as 'video' | 'live' | 'vr',
        status: isVideo ? 'PENDING_REVIEW' : 'PUBLISHED', // Videos need processing
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

    // Queue background jobs after content creation
    if (isVideo) {
      // Queue video transcoding job
      await queueVideoTranscoding({
        contentId: content.id,
        videoUrl: mediaUrl,
        qualities: ['720p', '1080p', '4K'],
      });

      // Queue thumbnail generation if not provided
      if (!thumbnailFile) {
        await queueThumbnailGeneration({
          contentId: content.id,
          videoUrl: mediaUrl,
          timestamp: 0, // First frame
        });
      }
    }

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

    // Send notification to creator about upload
    await queueNotification({
      userId: userId,
      type: 'CONTENT_UPLOADED',
      title: 'Content Uploaded Successfully',
      message: `Your content "${title}" has been uploaded and is ${content.status === 'PUBLISHED' ? 'live' : 'being processed'}.`,
      link: `/content/${content.id}`,
      metadata: { contentId: content.id },
    });

    // Invalidate caches
    await invalidateSearchCache();
    await invalidateHomepageCache();

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
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message || 'Failed to upload content',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        });
      }
    }
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

    // Upload thumbnail to S3/R2
    const thumbnailResult = await s3Storage.uploadImage(
      file.buffer,
      file.originalname,
      'thumbnails'
    );
    const thumbnailUrl = thumbnailResult.cdnUrl || thumbnailResult.url;

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

