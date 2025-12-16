# Production Deployment Guide

This guide covers deploying the Dreamlust platform to production using various hosting providers.

## 🏗️ Infrastructure Overview

### Recommended Stack

- **Frontend**: Cloudflare Pages (recommended) or Vercel/Netlify
- **Backend API**: Railway, Render, or AWS ECS
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Cloudflare R2
- **Video Processing**: Mux
- **CDN**: Cloudflare
- **Redis**: Upstash or Redis Cloud
- **Monitoring**: Sentry + Datadog

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] CDN configured
- [ ] Monitoring tools set up
- [ ] Error tracking configured
- [ ] Backup strategy in place

## 🚀 Deployment Options

### Option 1: Cloudflare Pages (Frontend) + Railway (Backend)

#### Frontend Deployment (Cloudflare Pages)

1. **Connect Repository**
   ```bash
   # Push code to GitHub/GitLab
   git push origin main
   ```

2. **Configure in Cloudflare Dashboard**
   - Go to Cloudflare Dashboard → Pages
   - Create new project
   - Connect repository
   - Build settings:
     - Build command: `cd frontend && bun run build`
     - Build output directory: `frontend/dist`
     - Root directory: `/`

3. **Set Environment Variables**
   - In Cloudflare Pages → Settings → Environment Variables
   - Add all `VITE_*` variables from `.env.production.example`

4. **Custom Domain**
   - Add custom domain in Pages settings
   - Update DNS records as instructed

#### Backend Deployment (Railway)

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   railway init
   ```

2. **Configure Service**
   - Add PostgreSQL service (or use Supabase)
   - Add Redis service
   - Set environment variables from `.env.production.example`

3. **Deploy**
   ```bash
   # Deploy from backend directory
   cd backend
   railway up
   ```

4. **Set Custom Domain**
   - In Railway dashboard → Settings → Domains
   - Add custom domain: `api.yourplatform.com`

### Option 2: Vercel (Full Stack)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   # From project root
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.production.example`

4. **Configure Routes**
   - Routes are defined in `vercel.json`
   - API routes: `/api/*` → `backend/src/server.ts`
   - Frontend: `/*` → `frontend/dist`

### Option 3: Netlify (Frontend) + Render (Backend)

#### Frontend (Netlify)

1. **Connect Repository**
   - Netlify Dashboard → Add new site → Import from Git
   - Select repository

2. **Build Settings**
   - Build command: `cd frontend && bun run build`
   - Publish directory: `frontend/dist`
   - Base directory: `/`

3. **Environment Variables**
   - Site settings → Environment variables
   - Add all `VITE_*` variables

#### Backend (Render)

1. **Create Web Service**
   - Render Dashboard → New → Web Service
   - Connect repository
   - Root directory: `backend`
   - Build command: `bun install && bunx prisma generate`
   - Start command: `bun run start`

2. **Add Services**
   - PostgreSQL (or use Supabase)
   - Redis

3. **Environment Variables**
   - Add all variables from `.env.production.example`

## 🔧 Environment Setup

### 1. Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Generate VAPID keys
cd backend
bun run generate:vapid
```

### 2. Database Setup

1. **Supabase Production Database**
   - Create new project in Supabase
   - Use connection pooling for production
   - Connection string format:
     ```
     postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
     ```

2. **Run Migrations**
   ```bash
   cd backend
   bunx prisma migrate deploy
   ```

### 3. Storage Setup (Cloudflare R2)

1. **Create Bucket**
   - Cloudflare Dashboard → R2 → Create bucket
   - Name: `dreamlust-uploads` (or your choice)

2. **Create API Token**
   - R2 → Manage R2 API Tokens → Create API Token
   - Permissions: Object Read & Write

3. **Configure Custom Domain (Optional)**
   - R2 → Bucket → Settings → Custom Domain
   - Add: `cdn.yourplatform.com`

### 4. Video Processing (Mux)

1. **Create Mux Account**
   - Sign up at https://mux.com
   - Create access token
   - Get signing key for webhooks

2. **Configure Webhooks**
   - Mux Dashboard → Settings → Webhooks
   - Add webhook URL: `https://api.yourplatform.com/api/webhooks/mux`

### 5. Redis Setup

**Option A: Upstash (Recommended)**
1. Create account at https://upstash.com
2. Create Redis database
3. Copy connection URL

**Option B: Redis Cloud**
1. Create account at https://redis.com/cloud
2. Create database
3. Copy connection URL

## 📊 Monitoring Setup

### Sentry (Error Tracking)

1. **Create Account**
   - Sign up at https://sentry.io
   - Create new project (Node.js for backend, React for frontend)

2. **Install SDK**
   ```bash
   # Backend
   cd backend
   bun add @sentry/node @sentry/profiling-node

   # Frontend
   cd frontend
   bun add @sentry/react
   ```

3. **Configure**
   - Add `SENTRY_DSN` to environment variables
   - See `backend/src/lib/monitoring/sentry.ts` for setup

### Datadog (APM & Logging)

1. **Create Account**
   - Sign up at https://datadoghq.com
   - Create API key and Application key

2. **Install Agent** (if using self-hosted)
   ```bash
   # Follow Datadog installation guide for your platform
   ```

3. **Configure**
   - Add `DATADOG_API_KEY` and `DATADOG_APP_KEY` to environment variables

## 🔒 Security Checklist

- [ ] All secrets in environment variables (never in code)
- [ ] HTTPS enabled for all domains
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS protection (React auto-escaping)
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Database connection pooling enabled
- [ ] Row Level Security (RLS) enabled in Supabase

## 🧪 Post-Deployment Testing

1. **Health Check**
   ```bash
   curl https://api.yourplatform.com/health
   ```

2. **Test Authentication**
   - Sign up new user
   - Login
   - Verify JWT tokens

3. **Test File Upload**
   - Upload image
   - Verify stored in R2
   - Verify CDN URL works

4. **Test Video Processing**
   - Upload video
   - Verify Mux processing
   - Verify playback

5. **Test Payments**
   - Test with Stripe test mode
   - Verify webhooks

## 📈 Performance Optimization

1. **Enable CDN Caching**
   - Static assets: 1 year
   - API responses: Appropriate TTL

2. **Database Optimization**
   - Enable connection pooling
   - Add indexes for frequent queries
   - Monitor slow queries

3. **Image Optimization**
   - Use WebP format
   - Implement lazy loading
   - Use responsive images

4. **Code Splitting**
   - Already configured in `vite.config.ts`
   - Verify bundle sizes

## 🔄 CI/CD Pipeline

See `.github/workflows/deploy.yml` for automated deployment workflow.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection string format
   - Verify Supabase project is active
   - Check firewall rules

2. **Environment Variables Not Loading**
   - Verify variable names match exactly
   - Check for typos
   - Restart service after adding variables

3. **Build Failures**
   - Check Node.js/Bun version
   - Verify all dependencies installed
   - Check build logs

4. **CORS Errors**
   - Verify `FRONTEND_URL` matches actual frontend domain
   - Check CORS middleware configuration

## 📚 Additional Resources

- [Supabase Production Guide](https://supabase.com/docs/guides/platform)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Mux Production Guide](https://docs.mux.com/guides/video)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)


