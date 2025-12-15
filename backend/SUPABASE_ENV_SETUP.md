# Supabase Environment Setup Guide

## 🔑 Required Environment Variables for Backend

Your backend `.env` file needs these Supabase variables:

### 1. DATABASE_URL
This is your **PostgreSQL connection string** from Supabase.

**Where to find it:**
1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **Database**
3. Scroll down to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (it looks like this):

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**Important:** Replace `[YOUR-PASSWORD]` with your actual database password!

**Add to `.env`:**
```env
DATABASE_URL=postgresql://postgres:your_password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 2. SUPABASE_URL
This is your **Supabase project URL**.

**Where to find it:**
1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Find **Project URL** (it looks like this):

```
https://xxxxxxxxxxxxx.supabase.co
```

**Add to `.env`:**
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
```

⚠️ **Note:** In the backend, use `SUPABASE_URL` (NOT `VITE_SUPABASE_URL`)

### 3. SUPABASE_SERVICE_ROLE_KEY
This is your **service role key** (secret key with admin privileges).

**Where to find it:**
1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Find **service_role** key under **Project API keys**
4. Click the eye icon to reveal it

⚠️ **Security Warning:** This is a secret key! Never commit it to git or share it publicly.

**Add to `.env`:**
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 Complete Backend .env Example

```env
NODE_ENV=development
PORT=3001

# Supabase Database
DATABASE_URL=postgresql://postgres:your_password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration
JWT_SECRET=this_is_a_very_long_secret_key_for_jwt_tokens_min_32_chars_required
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs
FRONTEND_URL=http://localhost:4000
API_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_USER=100
RATE_LIMIT_MAX_REQUESTS_IP=1000
```

## 🎯 Frontend .env (Different!)

The **frontend** uses different variable names with the `VITE_` prefix:

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3001
```

⚠️ **Important Differences:**
- Frontend uses `VITE_SUPABASE_ANON_KEY` (public key)
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` (secret admin key)
- Frontend variables need `VITE_` prefix for Vite to expose them

## 🚀 After Setting Up

1. **Restart the backend server:**
   ```bash
   cd backend
   # Kill the current server (Ctrl+C)
   bun run dev
   ```

2. **Generate Prisma client:**
   ```bash
   cd backend
   bun run db:generate
   ```

3. **Push schema to Supabase (optional, if you want to use Prisma migrations):**
   ```bash
   cd backend
   bun run db:push
   ```

## ✅ Verify Connection

Once configured, restart the server and you should see:
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔗 Frontend URL: http://localhost:4000
✅ Server ready to accept connections
```

And the database authentication errors should be gone!

## 🔒 Security Checklist

- ✅ `.env` files are in `.gitignore`
- ✅ Never commit `.env` files to git
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` only in backend (never in frontend)
- ✅ Use `VITE_SUPABASE_ANON_KEY` in frontend (this is safe to expose)
- ✅ Keep your database password secure

## 📚 Additional Resources

- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)


