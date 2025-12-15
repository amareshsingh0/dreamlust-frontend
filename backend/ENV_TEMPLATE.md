# Environment Variables Template

Copy this to your `backend/.env` file and replace the placeholder values with your real credentials.

```env
# ===================================
# BASIC CONFIGURATION
# ===================================
NODE_ENV=development
PORT=3001

# ===================================
# DATABASE & SUPABASE (REQUIRED)
# ===================================
# Get from: Supabase Dashboard → Settings → Database → Connection string
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Get from: Supabase Dashboard → Settings → API → Project URL
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Get from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===================================
# JWT CONFIGURATION (REQUIRED)
# ===================================
JWT_SECRET=your_very_long_secret_key_minimum_32_characters_required_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ===================================
# URLS (REQUIRED)
# ===================================
FRONTEND_URL=http://localhost:4000
API_URL=http://localhost:3001

# ===================================
# RATE LIMITING (REQUIRED)
# ===================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_USER=100
RATE_LIMIT_MAX_REQUESTS_IP=1000

# ===================================
# PAYMENT GATEWAYS (OPTIONAL)
# ===================================
# Razorpay (for India)
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_BASIC_PLAN_ID=plan_basic_id
RAZORPAY_PLATINUM_PLAN_ID=plan_platinum_id
RAZORPAY_PRO_PLAN_ID=plan_pro_id

# Stripe (for international)
STRIPE_SECRET_KEY=sk_test_or_live_key

# ===================================
# REDIS (OPTIONAL - for caching/queues)
# ===================================
REDIS_URL=redis://localhost:6379

# ===================================
# CLOUDFLARE R2 STORAGE (OPTIONAL)
# ===================================
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.your-account.r2.cloudflarestorage.com

# ===================================
# SMTP EMAIL (OPTIONAL)
# ===================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_or_smtp_password

# ===================================
# MUX VIDEO (OPTIONAL)
# ===================================
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

## 🔑 Where to Get Each Credential

### Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → Database → Connection string (for DATABASE_URL)
4. Settings → API → Project URL (for SUPABASE_URL)
5. Settings → API → service_role key (for SUPABASE_SERVICE_ROLE_KEY)

### Razorpay
1. Go to https://dashboard.razorpay.com/
2. Settings → API Keys → Generate Key
3. For plan IDs: Plans → Copy each plan ID

### Stripe
1. Go to https://dashboard.stripe.com/
2. Developers → API keys → Secret key

### Cloudflare R2
1. Go to https://dash.cloudflare.com/
2. R2 → Create bucket
3. Manage R2 API Tokens → Create API Token

### Gmail SMTP
1. Go to your Google Account
2. Security → 2-Step Verification → App passwords
3. Generate app password for "Mail"

### Mux
1. Go to https://dashboard.mux.com/
2. Settings → Access Tokens
3. Generate new token

## ⚠️ Important Notes

- **DATABASE_URL**, **SUPABASE_URL**, **SUPABASE_SERVICE_ROLE_KEY** are REQUIRED
- All other services are optional
- Never commit your `.env` file to git
- Keep your service role key secret (never expose in frontend)


