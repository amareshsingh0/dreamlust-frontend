# Unconfigured Features - Setup Required

This document lists all features that are implemented in the codebase but require external service setup and configuration.

## 🔴 Critical - Required for Core Functionality

### 1. **Supabase** (Frontend & Backend)
**Status:** ✅ Configured
**Files:**
- `frontend/src/lib/supabaseClient.ts`
- `backend/src/lib/supabaseAdmin.ts`

**Required Environment Variables:**
```env
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co done
VITE_SUPABASE_ANON_KEY=your-anon-key done

# Backend (.env)
SUPABASE_URL=https://your-project.supabase.co done
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key done
```

**Setup Steps:**
1. Create a Supabase project at https://supabase.com
2. Get your project URL and keys from Settings > API
3. Add to environment variables
4. Run database migrations if needed

---

## 🟡 Important - Recommended for Production

### 2. **Sentry Error Tracking** (Frontend & Backend)
**Status:** ✅ Configured
**Files:**
- `frontend/src/lib/monitoring/sentry.ts`
- `backend/src/lib/monitoring/sentry.ts`

**Required Environment Variables:**
```env
# Frontend (.env)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx done
VITE_SENTRY_ENVIRONMENT=production done
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1 done
VITE_SENTRY_RELEASE=1.0.0 done

# Backend (.env)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx done
SENTRY_ENVIRONMENT=production done
SENTRY_TRACES_SAMPLE_RATE=0.1 done
SENTRY_RELEASE=1.0.0 done
SENTRY_SERVER_NAME=dreamlust-api done
```

**Setup Steps:**
1. Create account at https://sentry.io
2. Create a new project (React for frontend, Node.js for backend)
3. Copy DSN to environment variables
4. Configure release tracking

---

### 3. **Datadog APM & Logging** (Frontend & Backend)
**Status:** ❌ Not Used - Replaced with Sentry
**Note:** Datadog monitoring has been replaced with Sentry for error tracking and monitoring. Datadog configuration is optional and not required. All monitoring is handled by Sentry.

---

### 4. **Payment Gateways**

#### 4a. **Razorpay** (Primary Payment Gateway)
**Status:** ✅ Configured 
**Files:**
- `backend/src/routes/razorpay.ts`
- `backend/src/routes/payments.ts`

**Required Environment Variables:**
```env
RAZORPAY_KEY_ID=your-key-id DONE
RAZORPAY_KEY_SECRET=your-key-secret DONE
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret DONE
RAZORPAY_BASIC_PLAN_ID=plan_xxx DONE
RAZORPAY_PREMIUM_PLAN_ID=plan_xxx DONE
RAZORPAY_PRO_PLAN_ID=plan_xxx DONE
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
STRIPE_SECRET_KEY=sk_live_xxx I USED RAZOR PAY
STRIPE_WEBHOOK_SECRET=whsec_xxx I USED RAZOR PAY
STRIPE_PUBLISHABLE_KEY=pk_live_xxx I USED RAZOR PAY
```

#### 4c. **PayPal** (Alternative)
**Status:** ❌ Not configured
**Files:**
- `frontend/src/lib/paypal.ts`
- `backend/src/routes/payments.ts`

**Required Environment Variables:**
```env
PAYPAL_CLIENT_ID=your-client-id RAZOR PAY
PAYPAL_CLIENT_SECRET=your-client-secret RAZOR PAY
```

---

### 5. **Video Hosting Services**

#### 5a. **Mux** (Video Hosting)
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/video/mux.ts` (if exists)
- `backend/src/routes/upload.ts`

**Required Environment Variables:**
```env
MUX_TOKEN_ID=your-token-id done
MUX_TOKEN_SECRET=your-token-secret done
MUX_SIGNING_KEY=your-signing-key done
MUX_SIGNING_KEY_ID=your-signing-key-id done
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
CLOUDFLARE_STREAM_API_TOKEN=your-api-token used mux
CLOUDFLARE_ACCOUNT_ID=your-account-id used mux
```

---

### 6. **File Storage Services**

#### 6a. **AWS S3** (Object Storage)
**Status:** ❌ Not configured
**Files:**
- `backend/src/lib/storage/s3.ts` (if exists)

**Required Environment Variables:**

#### 6b. **Cloudflare R2** (Alternative to S3)
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/storage/r2.ts` (if exists)

**Required Environment Variables:**
```env
R2_ACCOUNT_ID=your-account-id done
R2_ACCESS_KEY_ID=your-access-key done
R2_SECRET_ACCESS_KEY=your-secret-key done
R2_BUCKET_NAME=your-bucket-name done
R2_PUBLIC_URL=https://your-bucket.r2.dev done
```

**Setup Steps:**
1. Create R2 bucket in Cloudflare dashboard
2. Create API token
3. Configure CORS for bucket
4. Set up custom domain (optional)

---

### 7. **Email Service (SMTP)**
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/email/` (if exists)
- `backend/src/routes/notifications.ts`

**Required Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com DONE
SMTP_PORT=587 DONE
SMTP_USER=your-email@gmail.com DONE
SMTP_PASSWORD=your-app-password DONE
SMTP_FROM=noreply@yourdomain.com DONE
```

**Setup Steps:**
1. Use Gmail, SendGrid, Mailgun, or AWS SES
2. For Gmail: Enable 2FA and create App Password
3. Configure SMTP settings

---

### 8. **Push Notifications (VAPID)**
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/push/` (if exists)
- `backend/src/routes/push.ts`

**Required Environment Variables:**
```env
VAPID_PUBLIC_KEY=your-public-key done
VAPID_PRIVATE_KEY=your-private-key done
VAPID_SUBJECT=mailto:your-email@domain.com done
```

**Setup Steps:**
1. Generate VAPID keys using: `bun run backend/scripts/generate-vapid-keys.js`
2. Add keys to environment variables
3. Configure in browser for service worker

---

## 🟢 Optional - Nice to Have

### 9. **Redis** (Session Management & Caching)
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/cache/redis.ts` (if exists)

**Required Environment Variables:**
```env
REDIS_URL=redis://localhost:6379 done
# Or for cloud Redis:
REDIS_URL=rediss://user:password@host:port done
```

**Setup Steps:**
1. Install Redis locally or use cloud service ( Upstash)
2. Configure connection URL
3. Enable for session management and caching

---

### 10. **OAuth Providers**

#### 10a. **Google OAuth**
**Status:** ✅ Configured
**Files:**
- `backend/src/routes/oauth.ts`

**Required Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id done
GOOGLE_CLIENT_SECRET=your-client-secret done
```

**Setup Steps:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Get client ID and secret

### 11. **Image Classification Services**
**Status:** ❌ Not Used - Removed/Disabled
**Note:** Image classification services (AWS Rekognition, Google Cloud Vision API) are not required for this project. The code exists but is disabled and not used. This feature has been intentionally excluded from the project.

---

### 12. **Alerting & Incident Response**

#### 12a. **Discord Webhooks** (Replaces Slack)
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/monitoring/slack.ts` (uses Discord webhook)
- `backend/src/config/env.ts` (supports both DISCORD_WEBHOOK_URL and SLACK_WEBHOOK_URL)

**Required Environment Variables:**
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/xxx ✅ DONE
# Note: Code supports both DISCORD_WEBHOOK_URL (preferred) and SLACK_WEBHOOK_URL (fallback)
# Discord webhooks are compatible with Slack webhook format
# SLACK_WEBHOOK_URL is deprecated - use DISCORD_WEBHOOK_URL instead
```

**Setup Steps:**
1. ✅ Create Discord webhook in your Discord server - Done
2. ✅ Copy webhook URL - Done
3. ✅ Add to environment variables as `DISCORD_WEBHOOK_URL` - Done
4. ✅ The monitoring system will use Discord for notifications - Configured
5. ✅ All alerting configured to use Discord webhooks - Done


### 13. **Encryption Key**
**Status:** ✅ Configured
**Files:**
- `backend/src/lib/encryption.ts` (if exists)
- `backend/src/config/env.ts`

**Required Environment Variables:**
```env
ENCRYPTION_KEY=35870d54320df4e30de01f785b712ac610bc289da780f63550486ed34fa0f093 ✅ DONE
```

**Setup Steps:**
1. ✅ Generate secure random key (32+ characters) - Done
2. ✅ Store securely (never commit to git) - Done
3. ✅ Use for encrypting sensitive data - Configured

---

## 📋 Setup Priority Checklist

### Phase 1 - Core Functionality (Do First)
- [x] Supabase (Frontend & Backend) ✅
- [x] Database migrations ✅
- [x] Basic authentication working ✅

### Phase 2 - Production Essentials
- [x] Sentry error tracking (Frontend & Backend) ✅
- [x] Email service (SMTP) ✅
- [x] File storage (R2) ✅
- [x] Video hosting (Mux) ✅

### Phase 3 - Payment & Monetization
- [x] Razorpay setup ✅
- [x] Create subscription plans ✅
- [x] Configure webhooks ✅
- [x] Test payment flow ✅

### Phase 4 - Monitoring & Observability
- [x] Sentry APM (Frontend & Backend) ✅ (Replaced Datadog)
- [x] Logging configuration ✅
- [x] Alerting (Discord) ✅

### Phase 5 - Additional Features
- [x] Push notifications (VAPID) ✅
- [x] OAuth providers (Google) ✅
- [x] Redis for caching ✅
- [x] Encryption key generated ✅
- [x] Discord webhooks configured ✅
- [x] Image classification (Not used - Removed) ✅

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

