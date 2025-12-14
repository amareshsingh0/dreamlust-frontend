/**
 * Security Headers Middleware
 * Configures comprehensive security headers for the application
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Configure Helmet with custom security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Set to true if you need strict isolation
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },
  // DNS Prefetch Control
  dnsPrefetchControl: true,
  // Expect-CT (deprecated but some browsers still use it)
  expectCt: false,
  // Frameguard (X-Frame-Options)
  frameguard: { action: 'sameorigin' },
  // Hide Powered-By
  hidePoweredBy: true,
  // HSTS (Strict-Transport-Security)
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff (X-Content-Type-Options)
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permissions Policy (formerly Feature-Policy)
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    interestCohort: [], // FLoC
    payment: ["'self'"], // Allow PayPal payments
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
    ambientLightSensor: [],
    autoplay: ["'self'"],
    encryptedMedia: ["'self'"],
    fullscreen: ["'self'"],
    pictureInPicture: ["'self'"],
  },
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // XSS Protection (legacy, but still useful)
  xssFilter: true,
});

/**
 * Additional custom security headers
 */
export const customSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // X-DNS-Prefetch-Control (already handled by helmet, but explicit)
  res.setHeader('X-DNS-Prefetch-Control', 'on');
  
  // Permissions-Policy (explicitly set as Helmet may not always set it)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );
  
  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Combined security middleware
 * Apply both helmet and custom headers
 */
export const securityMiddleware = [
  securityHeaders,
  customSecurityHeaders,
];

