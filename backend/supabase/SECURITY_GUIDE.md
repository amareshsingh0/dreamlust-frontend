# Supabase Security Guide

## Key Concepts

### Supabase API Keys vs Database Passwords

#### ✅ Supabase Anon Key (Frontend Safe)
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Characteristics:**
- ✅ Safe to use in frontend/client-side code
- ✅ Protected by Row Level Security (RLS)
- ✅ Limited permissions based on RLS policies
- ✅ Can be exposed in browser DevTools (by design)
- ✅ Public key (starts with `eyJ`)

**Where to get it:**
- Supabase Dashboard → Settings → API
- Look for "Project API keys" → `anon` `public` key

#### ❌ Database Password (Backend Only)
```
DATABASE_URL=postgresql://user:password@host:5432/db
```

**Characteristics:**
- ❌ NEVER use in frontend
- ❌ Full database access
- ❌ Bypasses all security
- ❌ Can delete/modify all data
- ❌ Store in password manager only

## Current Setup

### Frontend Code (✅ Correct)
```typescript
// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Uses API keys - Safe for frontend
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Backend Code (If Needed)
```typescript
// Backend API route only
// Uses DATABASE_URL for direct PostgreSQL connection
import { prisma } from '@/lib/prisma'; // Backend only!
```

## Security Checklist

- [x] `.env` in `.gitignore` - Prevents accidental commits
- [x] Using Supabase API keys (anon key) in frontend
- [x] Database password only in `.env` (backend use)
- [x] Created `.env.example` for documentation
- [ ] Store actual DB password in password manager
- [ ] Never commit `.env` file
- [ ] Use RLS policies to protect data

## Row Level Security (RLS)

RLS is your first line of defense when using Supabase API keys in frontend:

```sql
-- Example: Users can only read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

**Benefits:**
- Even if someone gets your anon key, they can only access data allowed by RLS
- Policies are enforced at the database level
- Works automatically with Supabase client

## Best Practices

1. **Always enable RLS** on all tables
2. **Use least privilege** - Only grant necessary permissions
3. **Test RLS policies** - Verify they work as expected
4. **Review policies regularly** - Update as needed
5. **Never use service_role key** in frontend (full access, no RLS)

## Service Role Key (Backend Only)

The `service_role` key bypasses RLS and has full access:

```
SUPABASE_SERVICE_ROLE_KEY=...  // ⚠️ Backend only!
```

**Use cases:**
- Admin operations
- Server-side operations
- Background jobs
- System maintenance

**NEVER use in frontend!**

## What to Do If Secrets Are Exposed

1. **Rotate immediately:**
   - Supabase Dashboard → Settings → API → Reset keys
   - Change database password
   
2. **Remove from Git:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Notify team** if shared credentials

4. **Review access logs** for unauthorized access

## Summary

| Type | Frontend? | Backend? | Storage |
|------|-----------|----------|---------|
| Supabase Anon Key | ✅ Yes | ✅ Yes | `.env` (safe) |
| Supabase Service Key | ❌ No | ✅ Yes | Password manager |
| Database Password | ❌ No | ✅ Yes | Password manager |

**Remember:** 
- Supabase JS = API keys (frontend OK)
- Direct PostgreSQL = DB password (backend only)

