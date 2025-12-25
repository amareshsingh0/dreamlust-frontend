/**
 * GDPR/CCPA Compliance Routes
 * Data export, deletion, and consent management
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { s3Storage } from '../lib/storage/s3Storage';
import JSZip from 'jszip';

const router = Router();

const cookieConsentSchema = z.object({
  necessary: z.boolean().default(true),
  functional: z.boolean().default(false),
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
});

/**
 * Save cookie consent preferences
 * POST /api/gdpr/cookie-consent
 */
router.post(
  '/cookie-consent',
  validateBody(cookieConsentSchema),
  asyncHandler(async (req, res) => {
    const { necessary, functional, analytics, marketing } = req.body;
    const userId = req.user?.userId;
    const sessionId = (req as any).sessionID || req.headers['x-session-id'];
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await prisma.$executeRaw`
      INSERT INTO cookie_consents (
        id, userId, sessionId, ipAddress, userAgent,
        necessary, functional, analytics, marketing,
        consent_given_at, consent_updatedAt, createdAt
      ) VALUES (
        gen_random_uuid(), ${userId || null}::uuid, ${sessionId},
        ${ipAddress}, ${userAgent}, ${necessary}, ${functional},
        ${analytics}, ${marketing}, NOW(), NOW(), NOW()
      )
      ON CONFLICT (sessionId) 
      DO UPDATE SET
        necessary = ${necessary},
        functional = ${functional},
        analytics = ${analytics},
        marketing = ${marketing},
        consent_updatedAt = NOW()
    `;

    res.json({ message: 'Cookie preferences saved' });
  })
);

/**
 * Get cookie consent preferences
 * GET /api/gdpr/cookie-consent
 */
router.get(
  '/cookie-consent',
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const sessionId = (req as any).sessionID || req.headers['x-session-id'];

    const consent = await prisma.$queryRaw`
      SELECT * FROM cookie_consents
      WHERE (userId = ${userId || null}::uuid OR sessionId = ${sessionId})
      ORDER BY createdAt DESC
      LIMIT 1
    ` as any[];

    if (!consent || consent.length === 0) {
      return res.json({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
    }

    res.json({
      necessary: consent[0].necessary,
      functional: consent[0].functional,
      analytics: consent[0].analytics,
      marketing: consent[0].marketing,
      consentGivenAt: consent[0].consent_given_at,
    });
  })
);

/**
 * Request data export (GDPR Article 15)
 * POST /api/gdpr/export-request
 */
router.post(
  '/export-request',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Check for pending requests
    const pendingRequest = await prisma.$queryRaw`
      SELECT * FROM data_export_requests
      WHERE userId = ${userId}
      AND status IN ('pending', 'processing')
      AND createdAt > NOW() - INTERVAL '30 days'
    ` as any[];

    if (pendingRequest && pendingRequest.length > 0) {
      throw new ValidationError('You already have a pending export request');
    }

    // Create export request
    const request = await prisma.$executeRaw`
      INSERT INTO data_export_requests (
        id, userId, request_type, status, createdAt, updatedAt
      ) VALUES (
        gen_random_uuid(), ${userId}, 'export', 'pending', NOW(), NOW()
      )
      RETURNING *
    `;

    // Queue export job (would be processed by a background worker)
    // queueDataExport(userId, requestId);

    res.status(201).json({
      message: 'Data export requested. You will receive an email when ready (within 30 days).',
      requestId: request,
    });
  })
);

/**
 * Request account deletion (GDPR Article 17 - Right to be forgotten)
 * POST /api/gdpr/deletion-request
 */
router.post(
  '/deletion-request',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { reason } = req.body;

    // Check if already scheduled
    const existingDeletion = await prisma.accountDeletion.findUnique({
      where: { userId: userId },
    });

    if (existingDeletion) {
      throw new ValidationError('Account deletion already scheduled');
    }

    // Schedule deletion for 30 days from now (cooling-off period)
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30);

    await prisma.accountDeletion.create({
      data: {
        userId: userId,
        scheduledFor: scheduledFor,
        reason: reason || 'User requested deletion',
        status: 'PENDING',
      },
    });

    res.json({
      message: 'Account deletion scheduled for 30 days from now. You can cancel before then.',
      scheduledFor,
    });
  })
);

/**
 * Cancel account deletion
 * POST /api/gdpr/cancel-deletion
 */
router.post(
  '/cancel-deletion',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const deletion = await prisma.accountDeletion.findUnique({
      where: { userId: userId },
    });

    if (!deletion || deletion.status !== 'pending') {
      throw new ValidationError('No pending deletion found');
    }

    await prisma.accountDeletion.delete({
      where: { userId: userId },
    });

    res.json({ message: 'Account deletion cancelled' });
  })
);

/**
 * Get export request status
 * GET /api/gdpr/export-status
 */
router.get(
  '/export-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const requests = await prisma.$queryRaw`
      SELECT * FROM data_export_requests
      WHERE userId = ${userId}
      ORDER BY createdAt DESC
      LIMIT 5
    `;

    res.json({ requests });
  })
);

/**
 * Download exported data
 * GET /api/gdpr/download/:requestId
 */
router.get(
  '/download/:requestId',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const request = await prisma.$queryRaw`
      SELECT * FROM data_export_requests
      WHERE id = ${requestId}::uuid
      AND userId = ${userId}
      AND status = 'completed'
    ` as any[];

    if (!request || request.length === 0) {
      throw new ValidationError('Export not found or not ready');
    }

    if (!request[0].export_url) {
      throw new ValidationError('Export file not available');
    }

    // Check if expired
    if (request[0].expiresAt && new Date() > new Date(request[0].expiresAt)) {
      throw new ValidationError('Export link has expired');
    }

    res.json({
      downloadUrl: request[0].export_url,
      expiresAt: request[0].expiresAt,
    });
  })
);

/**
 * Process data export (called by background worker)
 * This is a helper function, not a route
 */
export async function processDataExport(userId: string, requestId: string): Promise<void> {
  try {
    // Update status to processing
    await prisma.$executeRaw`
      UPDATE data_export_requests
      SET status = 'processing', updatedAt = NOW()
      WHERE id = ${requestId}::uuid
    `;

    // Gather all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPreferences: true,
        userSubscriptions: true,
        loyalty: true,
        feedback: true,
        savedSearches: true,
        collections: true,
        followers: true,
        following: true,
      },
    });

    const views = await prisma.view.findMany({
      where: { userId },
      take: 10000,
    });

    const likes = await prisma.like.findMany({
      where: { userId },
      take: 10000,
    });

    const comments = await prisma.comment.findMany({
      where: { userId },
      take: 10000,
    });

    const analyticsEvents = await prisma.analyticsEvent.findMany({
      where: { userId },
      take: 10000,
    });

    // Create ZIP file
    const zip = new JSZip();
    zip.file('user_profile.json', JSON.stringify(user, null, 2));
    zip.file('viewing_history.json', JSON.stringify(views, null, 2));
    zip.file('likes.json', JSON.stringify(likes, null, 2));
    zip.file('comments.json', JSON.stringify(comments, null, 2));
    zip.file('analytics.json', JSON.stringify(analyticsEvents, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Upload to R2
    const result = await s3Storage.uploadFile(
      zipBuffer,
      `user-export-${userId}-${Date.now()}.zip`,
      'exports'
    );

    // Set expiration to 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update request with download URL
    await prisma.$executeRaw`
      UPDATE data_export_requests
      SET status = 'completed',
          export_url = ${result.url},
          expiresAt = ${expiresAt}::timestamp,
          completedAt = NOW(),
          updatedAt = NOW()
      WHERE id = ${requestId}::uuid
    `;

    console.log(`Data export completed for user ${userId}`);
  } catch (error: any) {
    console.error('Data export failed:', error);

    await prisma.$executeRaw`
      UPDATE data_export_requests
      SET status = 'failed',
          error_message = ${error?.message || 'Unknown error'},
          updatedAt = NOW()
      WHERE id = ${requestId}::uuid
    `;
  }
}

export default router;
