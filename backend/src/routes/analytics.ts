import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter } from '../middleware/rateLimit';
import { trackViewEventSchema, trackInteractionSchema } from '../schemas/analytics';
import { NotFoundError } from '../lib/errors';
import { generateSessionId } from '../lib/auth/session';
import cookieParser from 'cookie-parser';

// Extend Express Request to include sessionId
declare module 'express-serve-static-core' {
  interface Request {
    sessionId?: string;
  }
}

const router = Router();

// Use cookie parser for session ID
router.use(cookieParser());

/**
 * Helper function to detect device type from user agent
 */
function detectDevice(userAgent: string | undefined): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';
  
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Helper function to get or create session ID
 */
function getSessionId(req: Request): { sessionId: string; isNew: boolean } {
  // Try to get from cookie
  let sessionId = req.cookies?.sessionId;
  const isNew = !sessionId;
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = generateSessionId();
  }
  
  return { sessionId, isNew };
}

/**
 * POST /api/analytics/view-event
 * Track detailed view event for recommendation engine
 */
router.post(
  '/view-event',
  optionalAuth,
  userRateLimiter,
  validateBody(trackViewEventSchema),
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId, watchDuration, completionRate, device, region } = req.body;
    
    // Get or create session ID
    const { sessionId, isNew } = getSessionId(req);
    
    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, duration: true },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check user preferences if authenticated
    let shouldTrack = true;
    if (userId) {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });
      if (preferences?.anonymousMode) {
        shouldTrack = false;
      }
    }

    if (shouldTrack) {
      // Detect device if not provided
      const detectedDevice = device || detectDevice(req.get('user-agent'));
      
      // Get region from preferences or request
      let userRegion = region;
      if (!userRegion && userId) {
        const preferences = await prisma.userPreferences.findUnique({
          where: { userId },
          select: { region: true },
        });
        userRegion = preferences?.region || undefined;
      }

      // Create view event
      await prisma.viewEvent.create({
        data: {
          userId: userId || undefined,
          contentId,
          sessionId,
          watchDuration,
          completionRate,
          device: detectedDevice,
          region: userRegion,
        },
      });
    }

    // Set session cookie if new
    if (isNew) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    res.json({
      success: true,
      message: 'View event tracked',
    });
  }
);

/**
 * POST /api/analytics/interaction
 * Track user interaction (like, save, share, skip, etc.)
 */
router.post(
  '/interaction',
  optionalAuth,
  userRateLimiter,
  validateBody(trackInteractionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId, type } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to track interactions',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if interaction already exists
    const existing = await prisma.interaction.findUnique({
      where: {
        userId_contentId_type: {
          userId,
          contentId,
          type,
        },
      },
    });

    if (existing) {
      // Update timestamp if interaction already exists
      await prisma.interaction.update({
        where: { id: existing.id },
        data: { timestamp: new Date() },
      });
    } else {
      // Create new interaction
      await prisma.interaction.create({
        data: {
          userId,
          contentId,
          type,
        },
      });
    }

    res.json({
      success: true,
      message: 'Interaction tracked',
    });
  }
);

/**
 * GET /api/analytics/stats
 * Get analytics stats for a user (if authenticated) or session
 */
router.get(
  '/stats',
  optionalAuth,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const sessionId = req.cookies?.sessionId;

    if (!userId && !sessionId) {
      return res.json({
        success: true,
        data: {
          viewEvents: 0,
          interactions: 0,
        },
      });
    }

    const [viewEventCount, interactionCount] = await Promise.all([
      userId
        ? prisma.viewEvent.count({ where: { userId } })
        : prisma.viewEvent.count({ where: { sessionId: sessionId || '' } }),
      userId
        ? prisma.interaction.count({ where: { userId } })
        : Promise.resolve(0), // Interactions require authentication
    ]);

    res.json({
      success: true,
      data: {
        viewEvents: viewEventCount,
        interactions: interactionCount,
      },
    });
  }
);

export default router;

