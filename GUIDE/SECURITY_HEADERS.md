# Security Headers Configuration

This document describes the security headers implemented in the Dreamlust application.

## Backend Security Headers (Express.js)

The backend uses `helmet` middleware with custom configuration to set comprehensive security headers. All headers are configured in `backend/src/middleware/security.ts`.

### Implemented Headers

1. **X-DNS-Prefetch-Control**: `on`
   - Controls DNS prefetching

2. **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload`
   - Forces HTTPS connections for 2 years
   - Applies to all subdomains
   - Eligible for HSTS preload list

3. **X-Frame-Options**: `SAMEORIGIN`
   - Prevents clickjacking attacks
   - Only allows framing from same origin

4. **X-Content-Type-Options**: `nosniff`
   - Prevents MIME type sniffing
   - Forces browsers to respect declared content types

5. **Referrer-Policy**: `strict-origin-when-cross-origin`
   - Controls referrer information sent with requests
   - Sends full URL for same-origin, origin only for cross-origin HTTPS

6. **Permissions-Policy** (formerly Feature-Policy):
   - `camera=()` - Blocks camera access
   - `microphone=()` - Blocks microphone access
   - `geolocation=()` - Blocks geolocation access
   - `payment=(self)` - Allows payment APIs (for PayPal integration)

7. **Content-Security-Policy (CSP)**
   - Restricts resource loading to prevent XSS attacks
   - Configured to allow necessary resources while blocking malicious content

8. **Cross-Origin Policies**
   - Cross-Origin-Opener-Policy: `same-origin`
   - Cross-Origin-Resource-Policy: `same-origin`
   - Cross-Origin-Embedder-Policy: `false` (can be enabled if needed)

## Frontend Security Headers (Vite)

The frontend development server includes a custom Vite plugin that adds security headers during development.

### Development Server

Headers are automatically added via `vite.config.security-headers.ts` plugin.

### Production Deployment

In production, security headers should be configured at the web server level:

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Security Headers
    add_header X-DNS-Prefetch-Control "on" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self)" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Remove server information
    more_clear_headers "X-Powered-By";

    # Your other configuration...
}
```

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set X-DNS-Prefetch-Control "on"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self)"
    Header set X-XSS-Protection "1; mode=block"
    Header unset X-Powered-By
</IfModule>
```

#### Cloudflare Configuration

If using Cloudflare, you can set headers via:
1. Cloudflare Dashboard → Rules → Transform Rules → Modify Response Header
2. Or use Cloudflare Workers to add headers

#### Vercel Configuration (vercel.json)

```json
{
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "X-DNS-Prefetch-Control",
          "value": "on"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(self)"
        }
      ]
    }
  ]
}
```

#### Netlify Configuration (netlify.toml)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-DNS-Prefetch-Control = "on"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=(self)"
    X-XSS-Protection = "1; mode=block"
```

## Testing Security Headers

### Using Browser DevTools

1. Open your application in the browser
2. Open DevTools (F12)
3. Go to Network tab
4. Reload the page
5. Click on any request
6. Check the "Response Headers" section

### Using Online Tools

- **SecurityHeaders.com**: https://securityheaders.com/
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **SSL Labs**: https://www.ssllabs.com/ssltest/ (for HTTPS/SSL testing)

### Using cURL

```bash
curl -I https://yourdomain.com
```

## Security Best Practices

1. **Always use HTTPS in production**
   - HSTS header requires HTTPS to work
   - Use Let's Encrypt for free SSL certificates

2. **Regular Security Audits**
   - Test headers regularly
   - Keep dependencies updated
   - Monitor security advisories

3. **Content Security Policy**
   - Review and adjust CSP directives based on your needs
   - Use CSP reporting to identify violations

4. **Permissions Policy**
   - Only enable features you actually use
   - Review and restrict unnecessary permissions

## Notes

- Some headers (like HSTS) only work over HTTPS
- CSP may need adjustment based on third-party services (PayPal, analytics, etc.)
- Test thoroughly after implementing headers to ensure functionality isn't broken
- Headers are additive - more restrictive is generally better for security

