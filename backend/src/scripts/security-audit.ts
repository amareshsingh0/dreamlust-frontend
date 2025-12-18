/**
 * Security Audit Script
 * Checks all routes for proper security implementation
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface RouteAudit {
  file: string;
  routes: Array<{
    method: string;
    path: string;
    hasAuth: boolean;
    hasRateLimit: boolean;
    hasValidation: boolean;
    hasCSRF: boolean;
    line: number;
  }>;
  issues: string[];
}

async function auditRoutes(): Promise<RouteAudit[]> {
  const routesDir = join(__dirname, '../routes');
  const files = await readdir(routesDir);
  const routeFiles = files.filter(f => f.endsWith('.ts') && !f.includes('__'));

  const audits: RouteAudit[] = [];

  for (const file of routeFiles) {
    const filePath = join(routesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const audit: RouteAudit = {
      file,
      routes: [],
      issues: [],
    };

    // Check for route definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const routeMatch = line.match(/router\.(get|post|put|delete|patch)\(/);
      
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const pathMatch = line.match(/['"`]([^'"`]+)['"`]/);
        const path = pathMatch ? pathMatch[1] : 'unknown';

        // Check next few lines for middleware
        const nextLines = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
        
        const hasAuth = /authenticate|optionalAuth/.test(nextLines);
        const hasRateLimit = /RateLimiter|rateLimiter/.test(nextLines);
        const hasValidation = /validateBody|validateQuery/.test(nextLines);
        const hasCSRF = /csrfProtect|optionalCsrfProtect/.test(nextLines);

        // Public endpoints that don't need auth
        const publicEndpoints = [
          '/health',
          '/api/health',
          '/api/auth/register',
          '/api/auth/login',
          '/api/auth/reset-password',
          '/api/auth/oauth',
        ];

        const isPublic = publicEndpoints.some(ep => path.includes(ep));

        audit.routes.push({
          method,
          path,
          hasAuth: hasAuth || isPublic,
          hasRateLimit: hasRateLimit || isPublic,
          hasValidation: hasValidation || ['GET', 'HEAD', 'OPTIONS'].includes(method),
          hasCSRF: hasCSRF || ['GET', 'HEAD', 'OPTIONS'].includes(method),
          line: i + 1,
        });

        // Check for issues
        if (!isPublic && method !== 'GET' && !hasAuth) {
          audit.issues.push(`Route ${method} ${path} (line ${i + 1}) missing authentication`);
        }
        if (!isPublic && !hasRateLimit) {
          audit.issues.push(`Route ${method} ${path} (line ${i + 1}) missing rate limiting`);
        }
        if (method !== 'GET' && !hasValidation && !isPublic) {
          audit.issues.push(`Route ${method} ${path} (line ${i + 1}) missing input validation`);
        }
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !hasCSRF && !isPublic) {
          audit.issues.push(`Route ${method} ${path} (line ${i + 1}) missing CSRF protection`);
        }
      }
    }

    if (audit.issues.length > 0 || audit.routes.length > 0) {
      audits.push(audit);
    }
  }

  return audits;
}

// Run audit if called directly
if (require.main === module) {
  auditRoutes().then(audits => {
    console.log('Security Audit Results:\n');
    
    let totalIssues = 0;
    for (const audit of audits) {
      if (audit.issues.length > 0) {
        console.log(`\n📁 ${audit.file}:`);
        audit.issues.forEach(issue => {
          console.log(`  ⚠️  ${issue}`);
          totalIssues++;
        });
      }
    }

    if (totalIssues === 0) {
      console.log('\n✅ No security issues found!');
    } else {
      console.log(`\n⚠️  Found ${totalIssues} security issue(s)`);
    }
  });
}

export { auditRoutes };

