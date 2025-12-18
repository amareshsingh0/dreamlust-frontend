import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { userRateLimiter, strictRateLimiter } from '../middleware/rateLimit';
import { validateQuery, validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import { autoModerateContent } from '../lib/moderation/autoModerationService';
import { csrfProtect } from '../middleware/csrf';

const router = Router();

/**
 * GET /api/admin/dashboard/stats
 * Get admin dashboard statistics
 */
router.get(
  '/dashboard/stats',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const [
      totalUsers,
      activeUsers24h,
      totalContent,
      weeklyViews,
      monthlyRevenue,
      pendingReports,
      totalCreators,
      newUsers7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          last_active_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.content.count({
        where: {
          deleted_at: null,
        },
      }),
      prisma.view.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.report.count({
        where: {
          status: 'PENDING',
        },
      }),
      prisma.creator.count({
        where: {
          status: 'APPROVED',
        },
      }),
      prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const userGrowth = newUsers7d > 0 
      ? ((newUsers7d / Math.max(totalUsers - newUsers7d, 1)) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers: activeUsers24h,
        totalContent,
        weeklyViews,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        pendingReports,
        totalCreators,
        userGrowth: `${userGrowth}%`,
      },
    });
  }
);

/**
 * GET /api/admin/dashboard/charts
 * Get chart data for admin dashboard
 */
router.get(
  '/dashboard/charts',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    period: z.enum(['7d', '30d', '90d']).default('30d'),
  })),
  async (req: Request, res: Response) => {
    const { period } = req.query as { period: '7d' | '30d' | '90d' };
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // User growth data
    const userGrowthData = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Revenue trend
    const revenueData = await prisma.$queryRaw<Array<{ date: string; amount: number }>>`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM transactions
      WHERE status = 'COMPLETED' AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top categories
    const categoryData = await prisma.contentCategory.groupBy({
      by: ['categoryId'],
      where: {
        content: {
          created_at: {
            gte: startDate,
          },
        },
      },
      _count: {
        categoryId: true,
      },
      orderBy: {
        _count: {
          categoryId: 'desc',
        },
      },
      take: 10,
    });

    const categoryIds = categoryData.map(c => c.categoryId);
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const topCategories = categoryData.map(c => ({
      name: categoryMap.get(c.categoryId) || 'Unknown',
      count: Number(c._count.categoryId),
    }));

    res.json({
      success: true,
      data: {
        userGrowth: userGrowthData.map(d => ({
          date: d.date,
          value: Number(d.count),
        })),
        revenue: revenueData.map(d => ({
          date: d.date,
          value: Number(d.amount),
        })),
        categories: topCategories,
      },
    });
  }
);

/**
 * GET /api/admin/dashboard/activity
 * Get recent activity for admin dashboard
 */
router.get(
  '/dashboard/activity',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })),
  async (req: Request, res: Response) => {
    const { limit } = req.query as { limit: number };

    const [recentReports, recentContent, recentUsers] = await Promise.all([
      prisma.report.findMany({
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.content.findMany({
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          creator: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          created_at: true,
        },
      }),
    ]);

    const activities = [
      ...recentReports.map(r => ({
        type: 'report' as const,
        id: r.id,
        title: `New report: ${r.type}`,
        description: r.reason,
        user: r.reporter.username || r.reporter.email,
        timestamp: r.created_at,
      })),
      ...recentContent.map(c => ({
        type: 'content' as const,
        id: c.id,
        title: `New content: ${c.title}`,
        description: `By ${c.creator.user.username}`,
        user: c.creator.user.username,
        timestamp: c.created_at,
      })),
      ...recentUsers.map(u => ({
        type: 'user' as const,
        id: u.id,
        title: `New user: ${u.username || u.email}`,
        description: `Role: ${u.role}`,
        user: u.username || u.email,
        timestamp: u.created_at,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: activities,
    });
  }
);

/**
 * GET /api/admin/users
 * Get users with filtering and pagination
 */
router.get(
  '/users',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE']).optional(),
    role: z.enum(['USER', 'CREATOR', 'MODERATOR', 'ADMIN']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })),
  async (req: Request, res: Response) => {
    const { search, status, role, page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { id: search },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              content: true,
              reports: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * GET /api/admin/users/:id
 * Get user details
 */
router.get(
  '/users/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        creator: true,
        _count: {
          select: {
            content: true,
            reports: true,
            subscriptions: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  }
);

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put(
  '/users/:id',
  authenticate,
  requireAdmin,
  csrfProtect,
  validateBody(z.object({
    role: z.enum(['USER', 'CREATOR', 'MODERATOR', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE']).optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).max(50).optional(),
  })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updates,
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  }
);

/**
 * POST /api/admin/users/:id/suspend
 * Suspend user
 */
router.post(
  '/users/:id/suspend',
  authenticate,
  requireAdmin,
  csrfProtect,
  validateBody(z.object({
    reason: z.string().optional(),
    duration: z.number().optional(), // days
  })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, duration } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User suspended successfully',
    });
  }
);

/**
 * POST /api/admin/users/:id/ban
 * Ban user
 */
router.post(
  '/users/:id/ban',
  authenticate,
  requireAdmin,
  csrfProtect,
  validateBody(z.object({
    reason: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'BANNED',
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User banned successfully',
    });
  }
);

/**
 * POST /api/admin/users/:id/impersonate
 * Get impersonation token (for admin to view as user)
 */
router.post(
  '/users/:id/impersonate',
  authenticate,
  requireAdmin,
  strictRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate impersonation token
    const { generateImpersonationToken } = await import('../lib/auth/impersonation');
    const impersonationToken = generateImpersonationToken(id, adminId);

    res.json({
      success: true,
      data: {
        token: impersonationToken,
        userId: user.id,
        username: user.username,
        email: user.email,
        expiresIn: '1h',
      },
    });
  }
);

/**
 * GET /api/admin/content
 * Get content with filtering
 */
router.get(
  '/content',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })),
  async (req: Request, res: Response) => {
    const { status, type, search, page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          creator: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              views: true,
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        content,
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
 * POST /api/admin/content/:id/remove
 * Remove content
 */
router.post(
  '/content/:id/remove',
  authenticate,
  requireAdmin,
  csrfProtect,
  validateBody(z.object({
    reason: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    await prisma.content.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        status: 'DELETED',
      },
    });

    res.json({
      success: true,
      message: 'Content removed successfully',
    });
  }
);

/**
 * POST /api/admin/creators/:id/warn
 * Warn creator
 */
router.post(
  '/creators/:id/warn',
  authenticate,
  requireAdmin,
  csrfProtect,
  validateBody(z.object({
    reason: z.string(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
  })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, severity } = req.body;

    const creator = await prisma.creator.findUnique({
      where: { id },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    // Create warning notification
    await prisma.notification.create({
      data: {
        user_id: creator.user_id,
        type: 'WARNING',
        title: 'Moderation Warning',
        message: reason,
        metadata: {
          severity: severity || 'medium',
          creatorId: id,
        },
      },
    });

    res.json({
      success: true,
      message: 'Creator warned successfully',
    });
  }
);

/**
 * POST /api/admin/moderation/auto-moderate/:contentId
 * Trigger auto-moderation for content
 */
router.post(
  '/moderation/auto-moderate/:contentId',
  authenticate,
  requireAdmin,
  csrfProtect,
  async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const result = await autoModerateContent(contentId);

    // Broadcast moderation result
    try {
      const { broadcastModerationResult } = require('../lib/websocket/adminBroadcast');
      broadcastModerationResult(contentId, {
        status: result.action,
        action: result.action,
        riskScore: result.riskScore,
      });
    } catch (error) {
      console.error('Error broadcasting moderation result:', error);
    }

    res.json({
      success: true,
      data: result,
    });
  }
);

export default router;

