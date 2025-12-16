# Production Setup Guide

Complete guide for setting up the Dreamlust platform in production.

## 📋 Prerequisites

- GitHub repository
- Supabase account
- Cloudflare account (for R2 and CDN)
- Mux account (for video processing)
- Railway/Render account (for backend hosting)
- Vercel/Netlify/Cloudflare Pages account (for frontend hosting)
- Sentry account (for error tracking)
- Domain name

## 🔧 Step-by-Step Setup

### 1. Environment Variables

#### Backend Production Environment

1. Copy the template:
   ```bash
   cp backend/.env.production.example backend/.env.production
   ```

2. Fill in all required values (see `backend/.env.production.example` for details)

3. **Critical Variables:**
   - `DATABASE_URL` - Supabase connection string (use pooling mode)
   - `JWT_SECRET` - Generate with `openssl rand -base64 32`
   - `ENCRYPTION_KEY` - Generate with `openssl rand -base64 32`
   - `REDIS_URL` - Redis connection string
   - `R2_*` - Cloudflare R2 credentials
   - `MUX_*` - Mux credentials
   - `SENTRY_DSN` - Sentry project DSN

#### Frontend Production Environment

1. Copy the template:
   ```bash
   cp frontend/.env.production.example frontend/.env.production
   ```

2. Fill in all `VITE_*` variables

3. **Critical Variables:**
   - `VITE_API_URL` - Backend API URL
   - `VITE_CDN_URL` - CDN URL for assets
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon key (public)
   - `VITE_SENTRY_DSN` - Sentry frontend DSN

### 2. Database Setup (Supabase)

1. **Create Production Project**
   - Go to https://supabase.com/dashboard
   - Create new project
   - Choose region closest to your users
   - Note the project reference ID

2. **Configure Connection Pooling**
   - Use Supabase connection pooling (port 6543)
   - Connection string format:
     ```
     postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
     ```

3. **Run Migrations**
   ```bash
   cd backend
   DATABASE_URL="your-production-database-url" bunx prisma migrate deploy
   ```

4. **Enable Row Level Security (RLS)**
   - Supabase Dashboard → Database → Tables
   - Enable RLS on all tables
   - Configure policies as needed

### 3. Storage Setup (Cloudflare R2)

1. **Create R2 Bucket**
   - Cloudflare Dashboard → R2 → Create bucket
   - Name: `dreamlust-uploads` (or your choice)
   - Choose region

2. **Create API Token**
   - R2 → Manage R2 API Tokens → Create API Token
   - Permissions: Object Read & Write
   - Copy `Access Key ID` and `Secret Access Key`

3. **Configure Custom Domain (Optional)**
   - R2 → Bucket → Settings → Custom Domain
   - Add: `cdn.yourplatform.com`
   - Update DNS records as instructed

4. **Set CORS Policy**
   ```json
   [
     {
       "AllowedOrigins": ["https://yourplatform.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### 4. Video Processing (Mux)

1. **Create Mux Account**
   - Sign up at https://mux.com
   - Create access token
   - Copy `Token ID` and `Token Secret`

2. **Get Signing Key**
   - Mux Dashboard → Settings → Signing Keys
   - Create new signing key
   - Copy `Signing Key` and `Signing Key ID`

3. **Configure Webhooks**
   - Mux Dashboard → Settings → Webhooks
   - Add webhook URL: `https://api.yourplatform.com/api/webhooks/mux`
   - Select events: `video.asset.ready`, `video.asset.errored`

### 5. Redis Setup

**Option A: Upstash (Recommended)**
1. Create account at https://upstash.com
2. Create Redis database
3. Choose region
4. Copy connection URL

**Option B: Redis Cloud**
1. Create account at https://redis.com/cloud
2. Create database
3. Copy connection URL

### 6. Backend Deployment

#### Option A: Railway

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   cd backend
   railway init
   ```

3. **Add Services**
   - Add PostgreSQL (or use Supabase)
   - Add Redis

4. **Set Environment Variables**
   - Railway Dashboard → Project → Variables
   - Add all variables from `.env.production`

5. **Deploy**
   ```bash
   railway up
   ```

6. **Set Custom Domain**
   - Railway Dashboard → Settings → Domains
   - Add: `api.yourplatform.com`

#### Option B: Render

1. **Create Web Service**
   - Render Dashboard → New → Web Service
   - Connect GitHub repository
   - Root directory: `backend`
   - Build command: `bun install && bunx prisma generate`
   - Start command: `bun run start`

2. **Add Services**
   - PostgreSQL (or use Supabase)
   - Redis

3. **Set Environment Variables**
   - Render Dashboard → Environment
   - Add all variables from `.env.production`

4. **Set Custom Domain**
   - Render Dashboard → Settings → Custom Domain
   - Add: `api.yourplatform.com`

### 7. Frontend Deployment

#### Option A: Cloudflare Pages

1. **Connect Repository**
   - Cloudflare Dashboard → Pages → Create project
   - Connect GitHub repository

2. **Configure Build**
   - Build command: `cd frontend && bun run build`
   - Build output directory: `frontend/dist`
   - Root directory: `/`

3. **Set Environment Variables**
   - Pages → Settings → Environment Variables
   - Add all `VITE_*` variables

4. **Set Custom Domain**
   - Pages → Settings → Custom domains
   - Add: `yourplatform.com`

#### Option B: Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add all `VITE_*` variables

4. **Set Custom Domain**
   - Vercel Dashboard → Project → Settings → Domains
   - Add: `yourplatform.com`

#### Option C: Netlify

1. **Connect Repository**
   - Netlify Dashboard → Add new site → Import from Git
   - Select repository

2. **Configure Build**
   - Build command: `cd frontend && bun run build`
   - Publish directory: `frontend/dist`
   - Base directory: `/`

3. **Set Environment Variables**
   - Site settings → Environment variables
   - Add all `VITE_*` variables

4. **Set Custom Domain**
   - Site settings → Domain management
   - Add: `yourplatform.com`

### 8. Monitoring Setup

#### Sentry

1. **Create Account**
   - Sign up at https://sentry.io
   - Create project (Node.js for backend, React for frontend)

2. **Install SDK** (Already done in code)
   - Backend: `@sentry/node`
   - Frontend: `@sentry/react`

3. **Configure**
   - Add `SENTRY_DSN` to backend environment variables
   - Add `VITE_SENTRY_DSN` to frontend environment variables
   - Sentry is automatically initialized on startup

#### Datadog (Optional)

1. **Create Account**
   - Sign up at https://datadoghq.com
   - Create API key and Application key

2. **Configure**
   - Add `DATADOG_API_KEY` and `DATADOG_APP_KEY` to backend environment variables

### 9. DNS Configuration

1. **A Record for API**
   - Type: A or CNAME
   - Name: `api`
   - Value: Backend service IP or domain

2. **CNAME for Frontend**
   - Type: CNAME
   - Name: `@` (root) or `www`
   - Value: Frontend service domain

3. **CNAME for CDN**
   - Type: CNAME
   - Name: `cdn`
   - Value: R2 custom domain or Cloudflare CDN

### 10. SSL Certificates

Most hosting providers automatically provision SSL certificates:
- **Cloudflare**: Automatic SSL
- **Vercel**: Automatic SSL
- **Netlify**: Automatic SSL
- **Railway**: Automatic SSL
- **Render**: Automatic SSL

### 11. Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://api.yourplatform.com/health
   ```

2. **Test Authentication**
   - Visit frontend
   - Sign up new user
   - Verify login works

3. **Test File Upload**
   - Upload image
   - Verify stored in R2
   - Verify CDN URL works

4. **Test Video Processing**
   - Upload video
   - Verify Mux processing
   - Verify playback

5. **Check Monitoring**
   - Verify Sentry is receiving errors
   - Check logs in hosting dashboard

## 🔒 Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enabled for all domains
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Database connection pooling enabled
- [ ] RLS enabled in Supabase
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (React)
- [ ] CSRF protection enabled

## 📊 Performance Optimization

1. **Enable CDN Caching**
   - Static assets: 1 year
   - API responses: Appropriate TTL

2. **Database Optimization**
   - Connection pooling enabled
   - Indexes for frequent queries
   - Monitor slow queries

3. **Image Optimization**
   - WebP format
   - Lazy loading
   - Responsive images

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

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [backend/.env.production.example](./backend/.env.production.example) - Backend env template
- [frontend/.env.production.example](./frontend/.env.production.example) - Frontend env template


