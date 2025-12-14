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
          'camera=(), microphone=(), geolocation=(), payment=(self)'
        );
        
        // X-XSS-Protection (legacy but still useful)
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Remove server information
        res.removeHeader('X-Powered-By');
        
        next();
      });
    },
  };
}

