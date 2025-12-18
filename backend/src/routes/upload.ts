import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { csrfProtect } from '../middleware/csrf';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { processThumbnailFromBuffer, generateVideoThumbnail } from '../lib/imageProcessing';
import { autoFlagContent } from '../lib/moderation/autoModeration';
import { invalidateSearchCache, invalidateHomepageCache } from '../lib/cache/contentCache';
import { s3Storage } from '../lib/storage/s3Storage';
import { videoStorage } from '../lib/storage/videoStorage';
import { trackUploadActivity } from '../lib/social/activityFeedService';
import {
  queueVideoTranscoding,
  queueThumbnailGeneration,
  queueNotification,
} from '../lib/queues/queueManager';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include Multer file fields
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
    interface Request {
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    }
  }
}

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
// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

router.post(
  '/content',
  authenticate,
  requireCreator,
  userRateLimiter,
  csrfProtect,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media', maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('📤 Upload request received:', {
      userId,
      hasFiles: !!files,
      fileFields: files ? Object.keys(files) : [],
      bodyKeys: Object.keys(req.body),
      mediaFileSize: files?.media?.[0]?.size,
      thumbnailFileSize: files?.thumbnail?.[0]?.size,
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
    const creator = await prisma.creator.findFirst({
      where: { user_id: userId },
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

    try {
      if (isVideo) {
        console.log('📹 Processing video upload...');
        // For videos, first upload to R2 as temporary storage, then to Mux/Cloudflare Stream
        // Mux requires a URL, not a direct buffer upload
        console.log('⏳ Uploading video to temporary storage...');
        const tempVideoResult = await withTimeout(
          s3Storage.uploadVideo(
            mediaFile.buffer,
            mediaFile.originalname,
            'temp-videos'
          ),
          300000, // 5 minutes timeout
          'Video upload to storage timed out after 5 minutes'
        );
        const tempVideoUrl = tempVideoResult.cdnUrl || tempVideoResult.url;
        console.log('✅ Video uploaded to temp storage:', tempVideoUrl);
        
        // Upload video to video storage service (Cloudflare Stream/Mux)
        // If video storage is not configured, use the temp URL directly
        try {
          console.log('⏳ Uploading video to video storage service...');
          const videoResult = await withTimeout(
            videoStorage.uploadVideo(tempVideoUrl, {
              title,
              description: description || undefined,
            }),
            300000, // 5 minutes timeout
            'Video upload to video storage service timed out after 5 minutes'
          );
          mediaUrl = videoResult.url;
          console.log('✅ Video uploaded to video storage:', mediaUrl);
        } catch (videoError: any) {
          console.warn('⚠️ Video storage service not available, using temp URL:', videoError.message);
          // Use temp URL as final URL if video storage fails
          mediaUrl = tempVideoUrl;
        }
      } else {
        console.log('🖼️ Processing image upload...');
        // Upload image to S3/R2 using uploadFile (not uploadImage) for content folder
        const imageResult = await withTimeout(
          s3Storage.uploadFile(
            mediaFile.buffer,
            mediaFile.originalname,
            'content'
          ),
          120000, // 2 minutes timeout
          'Image upload to storage timed out after 2 minutes'
        );
        mediaUrl = imageResult.cdnUrl || imageResult.url;
        console.log('✅ Image uploaded:', mediaUrl);
      }
    } catch (error: any) {
      console.error('❌ Storage upload error:', error);
      throw new ValidationError(
        `Failed to upload media file: ${error.message || 'Storage service error. Please check your storage configuration.'}`
      );
    }

    // Process thumbnail if provided (upload only, blur processing in background)
    if (thumbnailFile) {
      try {
        console.log('⏳ Uploading thumbnail...');
        // Upload thumbnail to S3/R2 (fast, don't wait for blur)
        const thumbnailResult = await withTimeout(
          s3Storage.uploadImage(
            thumbnailFile.buffer,
            thumbnailFile.originalname,
            'thumbnails'
          ),
          30000, // 30 seconds timeout
          'Thumbnail upload timed out'
        );
        thumbnailUrl = thumbnailResult.cdnUrl || thumbnailResult.url;
        console.log('✅ Thumbnail uploaded:', thumbnailUrl);
      } catch (error: any) {
        console.error('❌ Thumbnail upload error:', error);
        // Don't fail upload if thumbnail fails
      }
    }

    // Map lowercase type to uppercase enum value
    const contentTypeMap: Record<string, 'VIDEO' | 'LIVE_STREAM' | 'VR'> = {
      video: 'VIDEO',
      live: 'LIVE_STREAM',
      vr: 'VR',
    };
    const contentType = contentTypeMap[type] || 'VIDEO';

    // Create content (thumbnailBlur will be added in background if needed)
    const content = await prisma.content.create({
      data: {
        creatorId: creator.id,
        title,
        description,
        type: contentType,
        status: isVideo ? 'PENDING_REVIEW' : 'PUBLISHED', // Videos need processing
        thumbnail: thumbnailUrl,
        thumbnailBlur: null, // Will be set in background if thumbnail provided
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

    // Send email notifications to followers if content is published
    if (content.status === 'PUBLISHED') {
      import('../lib/email/sendNewUploadEmail').then(({ sendNewUploadEmail }) => {
        sendNewUploadEmail(
          {
            id: content.id,
            title: content.title,
            description: content.description || undefined,
            thumbnail: content.thumbnail || undefined,
            creatorId: creator.id,
          },
          {
            id: creator.id,
            display_name: creator.display_name,
            handle: creator.handle || undefined,
            avatar: creator.avatar || undefined,
          }
        ).catch((error) => {
          console.error('Failed to send new upload emails:', error);
        });
      });

      // Track upload activity for followers
      trackUploadActivity(content.id, creator.id).catch((error) => {
        console.error('Failed to track upload activity:', error);
      });
    }

    // Generate thumbnail blur in background (don't block response)
    if (thumbnailFile) {
      processThumbnailFromBuffer(content.id, thumbnailFile.buffer)
        .then(({ blurPlaceholder }) => {
          prisma.content.update({
            where: { id: content.id },
            data: { thumbnailBlur: blurPlaceholder },
          }).catch(err => console.error('Failed to update thumbnail blur:', err));
        })
        .catch(err => console.error('Failed to generate thumbnail blur:', err));
    }

    // Process tags and categories in parallel (much faster)
    const tagPromises = tags && Array.isArray(tags) ? tags.map(async (tagName) => {
      // Generate slug from tag name
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { 
          name: tagName,
          slug: tagSlug,
        },
      });
      return prisma.contentTag.create({
        data: {
          contentId: content.id,
          tagId: tag.id,
        },
      });
    }) : [];

    const categoryPromises = categories && Array.isArray(categories) ? categories.map(async (categoryName) => {
      // Generate slug from category name
      const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const category = await prisma.category.upsert({
        where: { slug: categorySlug },
        update: {},
        create: {
          name: categoryName,
          slug: categorySlug,
        },
      });
      return prisma.contentCategory.create({
        data: {
          contentId: content.id,
          categoryId: category.id,
        },
      });
    }) : [];

    // Wait for tags and categories in parallel
    await Promise.all([...tagPromises, ...categoryPromises]);

    // Queue all background jobs asynchronously (don't wait)
    Promise.all([
      // Queue video transcoding job if video
      isVideo ? queueVideoTranscoding({
        contentId: content.id,
        videoUrl: mediaUrl,
        qualities: ['720p', '1080p', '4K'],
      }) : Promise.resolve(),
      
      // Queue thumbnail generation if not provided
      (isVideo && !thumbnailFile) ? queueThumbnailGeneration({
        contentId: content.id,
        videoUrl: mediaUrl,
        timestamp: 0,
      }) : Promise.resolve(),
      
      // Auto-moderation in background (don't block response)
      Promise.resolve(autoFlagContent(content.id, creator.id)).catch(err => console.error('Auto-moderation error:', err)),
      
      // Broadcast new upload to admin dashboard
      Promise.resolve().then(() => {
        try {
          const { broadcastNewUpload } = require('../lib/websocket/adminBroadcast');
          broadcastNewUpload(content.id, {
            id: content.id,
            title: content.title,
            creatorId: creator.id,
            type: content.type,
            status: content.status,
          });
        } catch (error) {
          console.error('Error broadcasting new upload:', error);
        }
      }),
      
      // Send notification in background
      queueNotification({
        userId: userId,
        type: 'CONTENT_UPLOADED',
        title: 'Content Uploaded Successfully',
        message: `Your content "${title}" has been uploaded and is ${content.status === 'PUBLISHED' ? 'live' : 'being processed'}.`,
        link: `/content/${content.id}`,
        metadata: { contentId: content.id },
      }).catch(err => console.error('Notification error:', err)),
      
      // Invalidate caches in background
      invalidateSearchCache().catch(err => console.error('Cache invalidation error:', err)),
      invalidateHomepageCache().catch(err => console.error('Cache invalidation error:', err)),
    ]).catch(err => console.error('Background job error:', err));

    res.json({
      success: true,
      message: 'Content uploaded successfully',
      data: {
        content: {
          ...content,
        },
      },
    });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contentId } = req.params;
    const file = req.file;

    if (!file) {
      throw new ValidationError('Thumbnail file is required');
    }

    // Verify content ownership
    const creator = await prisma.creator.findFirst({
      where: { user_id: userId },
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
  })
);

export default router;

