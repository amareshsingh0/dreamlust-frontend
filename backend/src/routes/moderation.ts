import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireModerator } from '../middleware/authorize';
import { requireAdmin } from '../middleware/admin';
import { userRateLimiter } from '../middleware/rateLimit';
import { validateBody, validateQuery } from '../middleware/validation';
import { csrfProtect } from '../middleware/csrf';
import {
  createReportSchema,
  updateReportSchema,
  resolveReportSchema,
  createContentFlagSchema,
  updateContentFlagSchema,
  moderationQueueSchema,
} from '../schemas/moderation';
import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors';
import { autoFlagContent } from '../lib/moderation/autoModeration';
import { report_status, report_type } from '@prisma/client';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/moderation/report
 * Create a new report (any authenticated user)
 */
router.post(
  '/report',
  authenticate,
  userRateLimiter,
  validateBody(createReportSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { targetType, targetId, contentId, reportedUserId, type, reason, description } = req.body;

    // Validate that at least one target is provided
    if (!targetId && !contentId && !reportedUserId) {
      throw new ValidationError('At least one target (targetId, contentId, or reportedUserId) must be provided');
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        type: type as report_type,
        targetId: targetId,
        contentId: contentId,
        reportedUserId: reportedUserId,
        reason,
        description: description || null,
        status: 'PENDING',
      },
      include: {
        // Include related data for response
      },
    });

    // Auto-flag content if applicable
    if (contentId && type === 'content') {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { creatorId: true },
      });

      if (content) {
        await autoFlagContent(contentId, content.creatorId);
      }
    }

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report submitted successfully',
    });
  }
);

/**
 * GET /api/moderation/queue
 * Get moderation queue (moderators and admins only)
 */
router.get(
  '/queue',
  authenticate,
  requireModerator,
  validateQuery(moderationQueueSchema),
  async (req: Request, res: Response) => {
    const {
      status,
      type,
      severity,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // Get reports with content flags for severity filtering
    const reports = await prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy === 'createdAt' ? 'createdAt' : sortBy]: sortOrder,
      },
      include: {
        // Include related content/user data
      },
    });

    // If filtering by severity, we need to join with content_flags
    let filteredReports = reports;
    if (severity) {
      const contentIds = reports
        .filter(r => r.contentId)
        .map(r => r.contentId!);

      if (contentIds.length > 0) {
        const flags = await prisma.contentFlag.findMany({
          where: {
            contentId: { in: contentIds },
            severity,
            isActive: true,
          },
        });

        const flaggedContentIds = new Set(flags.map(f => f.contentId));
        filteredReports = reports.filter(r => 
          !r.contentId || flaggedContentIds.has(r.contentId)
        );
      }
    }

    const total = await prisma.report.count({ where });

    res.json({
      success: true,
      data: {
        reports: filteredReports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * GET /api/moderation/reports/:id
 * Get specific report details
 */
router.get(
  '/reports/:id',
  authenticate,
  requireModerator,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        // Include related data
      },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Get content flags if it's a content report
    let contentFlags: any[] = [];
    if (report.contentId) {
      contentFlags = await prisma.contentFlag.findMany({
        where: {
          contentId: report.contentId,
          isActive: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        report,
        contentFlags,
      },
    });
  }
);

/**
 * PUT /api/moderation/reports/:id
 * Update report status (moderators only)
 */
router.put(
  '/reports/:id',
  authenticate,
  requireModerator,
  validateBody(updateReportSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updates = req.body;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        ...updates,
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report updated successfully',
    });
  }
);

/**
 * POST /api/moderation/reports/:id/resolve
 * Resolve a report with action
 */
router.post(
  '/reports/:id/resolve',
  authenticate,
  requireModerator,
  csrfProtect,
  validateBody(resolveReportSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { status, action, moderatorNotes } = req.body;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Update report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: status as report_status,
        action: action || null,
        moderatorId: userId,
        moderatorNotes: moderatorNotes || null,
        reviewedBy: userId,
        reviewedAt: new Date(),
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Take action based on report resolution
    if (action === 'removed' && report.contentId) {
      // Soft delete content
      await prisma.content.update({
        where: { id: report.contentId },
        data: {
          deletedAt: new Date(),
          status: 'DELETED',
        },
      });
    } else if (action === 'banned' && report.reportedUserId) {
      // Ban user
      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: {
          status: 'BANNED',
        },
      });
    }

    // Broadcast new report if status changed to PENDING
    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      try {
        const { broadcastNewReport } = require('../lib/websocket/adminBroadcast');
        broadcastNewReport(updatedReport);
      } catch (error) {
        console.error('Error broadcasting new report:', error);
      }
    }

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report resolved successfully',
    });
  }
);

/**
 * POST /api/moderation/flags
 * Create content flag (moderators only)
 */
router.post(
  '/flags',
  authenticate,
  requireModerator,
  validateBody(createContentFlagSchema),
  async (req: Request, res: Response) => {
    const { contentId, flagType, reason, severity } = req.body;

    const flag = await prisma.contentFlag.upsert({
      where: {
        contentId_flagType_reason: {
          contentId: contentId,
          flagType: flagType,
          reason,
        },
      },
      update: {
        severity,
        isActive: true,
        resolvedAt: null,
      },
      create: {
        contentId: contentId,
        flagType: flagType,
        reason,
        severity,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: flag,
      message: 'Content flag created',
    });
  }
);

/**
 * GET /api/moderation/flags
 * Get content flags
 */
router.get(
  '/flags',
  authenticate,
  requireModerator,
  validateQuery(z.object({
    contentId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })),
  async (req: Request, res: Response) => {
    const { contentId, isActive, severity, page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (contentId) where.contentId = contentId;
    if (isActive !== undefined) where.isActive = isActive;
    if (severity) where.severity = severity;

    const flags = await prisma.contentFlag.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.contentFlag.count({ where });

    res.json({
      success: true,
      data: {
        flags,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * PUT /api/moderation/flags/:id
 * Update content flag
 */
router.put(
  '/flags/:id',
  authenticate,
  requireModerator,
  validateBody(updateContentFlagSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const flag = await prisma.contentFlag.findUnique({
      where: { id },
    });

    if (!flag) {
      throw new NotFoundError('Content flag not found');
    }

    const updatedFlag = await prisma.contentFlag.update({
      where: { id },
      data: {
        ...updates,
        resolvedAt: updates.isActive === false ? new Date() : flag.resolvedAt,
      },
    });

    res.json({
      success: true,
      data: updatedFlag,
      message: 'Content flag updated',
    });
  }
);

/**
 * GET /api/moderation/stats
 * Get moderation statistics (admins only)
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const [
      pendingReports,
      underReviewReports,
      resolvedReports,
      activeFlags,
      criticalFlags,
    ] = await Promise.all([
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.contentFlag.count({ where: { isActive: true } }),
      prisma.contentFlag.count({ where: { severity: 'critical', isActive: true } }),
    ]);

    res.json({
      success: true,
      data: {
        reports: {
          pending: pendingReports,
          underReview: underReviewReports,
          resolved: resolvedReports,
          total: pendingReports + underReviewReports + resolvedReports,
        },
        flags: {
          active: activeFlags,
          critical: criticalFlags,
        },
      },
    });
  }
);

export default router;

