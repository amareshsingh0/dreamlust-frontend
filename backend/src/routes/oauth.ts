import { Router, Request, Response, NextFunction } from 'express';
import passport from '../lib/auth/oauth';
import { generateTokenPair } from '../lib/auth/jwt';
import { generateSessionId, sessionStore } from '../lib/auth/session';
import { env } from '../config/env';

const router = Router();

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    sessionStore.create(sessionId, {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

// Twitter OAuth
router.get(
  '/twitter',
  passport.authenticate('twitter', {
    scope: ['include_email'],
  })
);

router.get(
  '/twitter/callback',
  passport.authenticate('twitter', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    sessionStore.create(sessionId, {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

export default router;

