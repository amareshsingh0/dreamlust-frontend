import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireModerator, requireAdmin } from '../middleware/authorize';
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
import { ReportStatus, ReportType } from '@prisma/client';
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
    const { contentType, targetId, contentId, reportedUserId, type, reason, description } = req.body;

    // Validate that at least one target is provided
    if (!targetId && !contentId && !reportedUserId) {
      throw new ValidationError('At least one target (targetId, contentId, or reportedUserId) must be provided');
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporter_id: userId,
        content_type: contentType,
        target_id: targetId,
        content_id: contentId,
        reported_user_id: reportedUserId,
        type: type as ReportType,
        reason,
        description: description || null,
        status: 'PENDING',
      },
      include: {
        // Include related data for response
      },
    });

    // Auto-flag content if applicable
    if (contentId && contentType === 'content') {
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
      contentType,
      severity,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (contentType) where.content_type = contentType;

    // Get reports with content flags for severity filtering
    const reports = await prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy === 'created_at' ? 'created_at' : sortBy]: sortOrder,
      },
      include: {
        // Include related content/user data
      },
    });

    // If filtering by severity, we need to join with content_flags
    let filteredReports = reports;
    if (severity) {
      const contentIds = reports
        .filter(r => r.content_id)
        .map(r => r.content_id!);

      if (contentIds.length > 0) {
        const flags = await prisma.contentFlag.findMany({
          where: {
            content_id: { in: contentIds },
            severity,
            is_active: true,
          },
        });

        const flaggedContentIds = new Set(flags.map(f => f.content_id));
        filteredReports = reports.filter(r => 
          !r.content_id || flaggedContentIds.has(r.content_id)
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
    let contentFlags = [];
    if (report.content_id) {
      contentFlags = await prisma.contentFlag.findMany({
        where: {
          content_id: report.content_id,
          is_active: true,
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
        reviewed_by: userId,
        reviewed_at: new Date(),
        updated_at: new Date(),
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
        status: status as ReportStatus,
        action: action || null,
        moderator_id: userId,
        moderator_notes: moderatorNotes || null,
        reviewed_by: userId,
        reviewed_at: new Date(),
        resolved_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Take action based on report resolution
    if (action === 'removed' && report.content_id) {
      // Soft delete content
      await prisma.content.update({
        where: { id: report.content_id },
        data: {
          deleted_at: new Date(),
          status: 'DELETED',
        },
      });
    } else if (action === 'banned' && report.reported_user_id) {
      // Ban user
      await prisma.user.update({
        where: { id: report.reported_user_id },
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
        content_flags_unique: {
          content_id: contentId,
          flag_type: flagType,
          reason,
        },
      },
      update: {
        severity,
        is_active: true,
        resolved_at: null,
      },
      create: {
        content_id: contentId,
        flag_type: flagType,
        reason,
        severity,
        is_active: true,
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
    if (contentId) where.content_id = contentId;
    if (isActive !== undefined) where.is_active = isActive;
    if (severity) where.severity = severity;

    const flags = await prisma.contentFlag.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
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
        resolved_at: updates.isActive === false ? new Date() : flag.resolved_at,
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
      prisma.contentFlag.count({ where: { is_active: true } }),
      prisma.contentFlag.count({ where: { severity: 'critical', is_active: true } }),
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

