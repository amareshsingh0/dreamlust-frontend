# Unconfigured Features - Setup Required

This document lists all features that are implemented in the codebase but require external service setup and configuration.

## 🔴 Critical - Required for Core Functionality

### 1. **Supabase** (Frontend & Backend)
**Status:** ⚠️ Partially configured
**Files:**
- `frontend/src/lib/supabaseClient.ts`
- `backend/src/lib/supabaseAdmin.ts`

**Required Environment Variables:**
```env
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Setup Steps:**
1. Create a Supabase project at https://supabase.com
2. Get your project URL and keys from Settings > API
3. Add to environment variables
4. Run database migrations if needed

---

## 🟡 Important - Recommended for Production

### 2. **Sentry Error Tracking** (Frontend & Backend)
**Status:** ❌ Not configured
**Files:**
- `frontend/src/lib/monitoring/sentry.ts`
- `backend/src/lib/monitoring/sentry.ts`

**Required Environment Variables:**
```env
# Frontend (.env)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=1.0.0

# Backend (.env)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=1.0.0
SENTRY_SERVER_NAME=dreamlust-api
```

**Setup Steps:**
1. Create account at https://sentry.io
2. Create a new project (React for frontend, Node.js for backend)
3. Copy DSN to environment variables
4. Configure release tracking

---

### 3. **Datadog APM & Logging** (Frontend & Backend)
**Status:** ❌ Not configured
**Files:**
- `frontend/src/lib/monitoring/datadog.ts`
- `backend/src/lib/monitoring/datadog.ts`

**Required Environment Variables:**
```env
# Frontend (.env)
VITE_DATADOG_APP_ID=your-app-id
VITE_DATADOG_CLIENT_TOKEN=your-client-token
VITE_DATADOG_SITE=datadoghq.com
VITE_DATADOG_ENV=production
VITE_APP_VERSION=1.0.0

# Backend (.env)
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
DD_SITE=datadoghq.com
DD_ENV=production
DD_SERVICE=dreamlust-api
DD_VERSION=1.0.0
```

**Setup Steps:**
1. Create account at https://datadoghq.com
2. Create RUM application (frontend)
3. Get API keys (backend)
4. Configure APM and logging

---

### 4. **Payment Gateways**

#### 4a. **Razorpay** (Primary Payment Gateway)
**Status:** ❌ Not configured
**Files:**
- `backend/src/routes/razorpay.ts`
- `backend/src/routes/payments.ts`

**Required Environment Variables:**
```env
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
RAZORPAY_BASIC_PLAN_ID=plan_xxx
RAZORPAY_PREMIUM_PLAN_ID=plan_xxx
RAZORPAY_PRO_PLAN_ID=plan_xxx
```

**Setup Steps:**
1. Create account at https://razorpay.com
2. Get API keys from Dashboard > Settings > API Keys
3. Create subscription plans
4. Configure webhook endpoint: `https://your-api.com/api/webhooks/razorpay`
5. Add webhook secret

#### 4b. **Stripe** (Legacy/Alternative)
**Status:** ❌ Not configured (Deprecated)
**Files:**
- `backend/src/routes/payments.ts`

**Required Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

#### 4c. **PayPal** (Alternative)
**Status:** ❌ Not configured
**Files:**
- `frontend/src/lib/paypal.ts`
- `backend/src/routes/payments.ts`

**Required Environment Variables:**
```env
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
```

---

### 5. **Video Hosting Services**

#### 5a. **Mux** (Video Hosting)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/video/mux.ts` (if exists)
- `backend/src/routes/upload.ts`

**Required Environment Variables:**
```env
MUX_TOKEN_ID=your-token-id
MUX_TOKEN_SECRET=your-token-secret
MUX_SIGNING_KEY=your-signing-key
MUX_SIGNING_KEY_ID=your-signing-key-id
```

**Setup Steps:**
1. Create account at https://mux.com
2. Get API tokens from Settings > API Access Tokens
3. Configure webhook: `https://your-api.com/api/webhooks/mux`

#### 5b. **Cloudflare Stream** (Alternative)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/video/cloudflare.ts` (if exists)

**Required Environment Variables:**
```env
CLOUDFLARE_STREAM_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

---

### 6. **File Storage Services**

#### 6a. **AWS S3** (Object Storage)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/storage/s3.ts` (if exists)

**Required Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET_NAME=your-bucket-name
S3_CDN_URL=https://cdn.yourdomain.com
```

#### 6b. **Cloudflare R2** (Alternative to S3)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/storage/r2.ts` (if exists)

**Required Environment Variables:**
```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Setup Steps:**
1. Create R2 bucket in Cloudflare dashboard
2. Create API token
3. Configure CORS for bucket
4. Set up custom domain (optional)

---

### 7. **Email Service (SMTP)**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/email/` (if exists)
- `backend/src/routes/notifications.ts`

**Required Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Setup Steps:**
1. Use Gmail, SendGrid, Mailgun, or AWS SES
2. For Gmail: Enable 2FA and create App Password
3. Configure SMTP settings

---

### 8. **Push Notifications (VAPID)**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/push/` (if exists)
- `backend/src/routes/push.ts`

**Required Environment Variables:**
```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:your-email@domain.com
```

**Setup Steps:**
1. Generate VAPID keys using: `bun run backend/scripts/generate-vapid-keys.js`
2. Add keys to environment variables
3. Configure in browser for service worker

---

## 🟢 Optional - Nice to Have

### 9. **Redis** (Session Management & Caching)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/cache/redis.ts` (if exists)

**Required Environment Variables:**
```env
REDIS_URL=redis://localhost:6379
# Or for cloud Redis:
REDIS_URL=rediss://user:password@host:port
```

**Setup Steps:**
1. Install Redis locally or use cloud service (Redis Cloud, Upstash)
2. Configure connection URL
3. Enable for session management and caching

---

### 10. **OAuth Providers**

#### 10a. **Google OAuth**
**Status:** ❌ Not configured
**Files:**
- `backend/src/routes/oauth.ts`

**Required Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Setup Steps:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Get client ID and secret

#### 10b. **Twitter OAuth**
**Status:** ❌ Not configured
**Files:**
- `backend/src/routes/oauth.ts`

**Required Environment Variables:**
```env
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
```

---

### 11. **Image Classification Services**

#### 11a. **AWS Rekognition**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/moderator/imageClassification.ts` (if exists)

**Required Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### 11b. **Google Cloud Vision API**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/moderator/imageClassification.ts` (if exists)

**Required Environment Variables:**
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Setup Steps:**
1. Create Google Cloud project
2. Enable Vision API
3. Create service account
4. Download JSON key file
5. Set path in environment variable

---

### 12. **Alerting & Incident Response**

#### 12a. **Slack Webhooks**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/monitoring/slack.ts`

**Required Environment Variables:**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
```

**Setup Steps:**
1. Create Slack app
2. Enable Incoming Webhooks
3. Create webhook URL
4. Add to environment variables

#### 12b. **PagerDuty**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/monitoring/pagerduty.ts`

**Required Environment Variables:**
```env
PAGERDUTY_INTEGRATION_KEY=your-integration-key
```

#### 12c. **Opsgenie**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/monitoring/opsgenie.ts`

**Required Environment Variables:**
```env
OPSGENIE_API_KEY=your-api-key
```

---

### 13. **Encryption Key**
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/encryption.ts` (if exists)

**Required Environment Variables:**
```env
ENCRYPTION_KEY=your-32-character-encryption-key
```

**Setup Steps:**
1. Generate secure random key (32+ characters)
2. Store securely (never commit to git)
3. Use for encrypting sensitive data

---

## 📋 Setup Priority Checklist

### Phase 1 - Core Functionality (Do First)
- [ ] Supabase (Frontend & Backend)
- [ ] Database migrations
- [ ] Basic authentication working

### Phase 2 - Production Essentials
- [ ] Sentry error tracking (Frontend & Backend)
- [ ] Email service (SMTP)
- [ ] File storage (S3 or R2)
- [ ] Video hosting (Mux or Cloudflare Stream)

### Phase 3 - Payment & Monetization
- [ ] Razorpay setup
- [ ] Create subscription plans
- [ ] Configure webhooks
- [ ] Test payment flow

### Phase 4 - Monitoring & Observability
- [ ] Datadog APM (Frontend & Backend)
- [ ] Logging configuration
- [ ] Alerting (Slack/PagerDuty)

### Phase 5 - Additional Features
- [ ] Push notifications (VAPID)
- [ ] OAuth providers (Google/Twitter)
- [ ] Redis for caching
- [ ] Image classification (optional)

---

## 🔧 Quick Setup Commands

### Generate VAPID Keys
```bash
cd backend
bun run scripts/generate-vapid-keys.js
```

### Test Supabase Connection
```bash
cd backend
bun run scripts/test-db-connection.ts
```

### Check Environment Variables
```bash
# Backend
cd backend
bun run -e "console.log(process.env)"

# Frontend (check .env file)
cat frontend/.env
```

---

## 📝 Notes

- All optional features will work with fallbacks if not configured
- Check console warnings for missing configurations
- Some features require paid service subscriptions
- Always use environment variables, never hardcode secrets
- Test in staging before production deployment

---

## 🆘 Need Help?

Refer to individual setup guides in the `GUIDE/` folder:
- `GUIDE/SUPABASE_SETUP.md`
- `GUIDE/DATADOG_SETUP.md`
- `GUIDE/PAYPAL_SETUP.md`
- `GUIDE/ENV_SETUP.md`

