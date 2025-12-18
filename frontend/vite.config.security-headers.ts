/**
 * Security Headers Plugin for Vite
 * Adds security headers to the development server
 * 
 * Note: In production, headers should be configured at the web server level
 * (nginx, Apache, Cloudflare, etc.) or via your hosting platform.
 */

import type { Plugin } from 'vite';

export function securityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // DNS Prefetch Control
        res.setHeader('X-DNS-Prefetch-Control', 'on');
        
        // Strict Transport Security (HSTS)
        // Note: Only set in production with HTTPS
        if (process.env.NODE_ENV === 'production') {
          res.setHeader(
            'Strict-Transport-Security',
            'max-age=63072000; includeSubDomains; preload'
          );
        }
        
        // X-Frame-Options
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        // X-Content-Type-Options
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions Policy (formerly Feature-Policy)
        res.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()'
        );
        
        // Cookie SameSite attribute (helps with third-party cookie warnings)
        // Note: This is set via cookie attributes, not headers
        // For third-party cookies, we document them in cookie policy
        
        // Content-Security-Policy (CSP) - Best Practices requirement
        // Allow same-origin, inline scripts (for Vite), and external CDNs
        const cspDirectives = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.paypal.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: https: blob:",
          "connect-src 'self' https://api.dreamlust.com https://checkout.razorpay.com https://www.paypal.com wss: ws:",
          "media-src 'self' https: blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          "upgrade-insecure-requests"
        ].join('; ');
        res.setHeader('Content-Security-Policy', cspDirectives);
        
        // X-XSS-Protection (legacy but still useful)
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Remove server information
        res.removeHeader('X-Powered-By');
        
        next();
      });
    },
  };
}

