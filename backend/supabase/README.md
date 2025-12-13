# Supabase Setup Guide

## Quick Start

### 1. Update Environment Variables

Add to your `.env` file:
```env
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraql.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_ANON_KEY_HERE
```

**Important:** Replace `PASTE_ANON_KEY_HERE` with your actual Supabase anon key from:
- Supabase Dashboard → Settings → API → Project API keys → `anon` `public` key

### 2. Run SQL Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run `001_initial_schema.sql` first (creates all tables, indexes, and RLS)
3. Then run `002_rls_policies.sql` (sets up Row Level Security policies)

### 3. Verify Setup

1. Check Supabase Table Editor:
   - Go to: Database → Table Editor
   - You should see all tables: `users`, `creators`, `content`, etc.

2. Test the connection:
   ```typescript
   import { addUser } from '@/lib/testSupabase';
   await addUser();
   ```

3. Check the `users` table in Supabase Dashboard

### 4. Restart Dev Server

After updating `.env`:
```bash
bun run dev
```

## Common Issues

### ❌ "Missing Supabase environment variables"
- **Fix:** Make sure `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Fix:** Restart dev server after updating `.env`

### ❌ "RLS not enabled"
- **Fix:** Run `002_rls_policies.sql` in Supabase SQL Editor
- **Fix:** Check that RLS is enabled: Database → Tables → [table] → Settings → Enable RLS

### ❌ "Wrong key (use anon, not service)"
- **Fix:** Use the `anon` `public` key, NOT the `service_role` key
- **Location:** Supabase Dashboard → Settings → API → Project API keys

### ❌ ".env pushed to GitHub"
- **Fix:** Make sure `.env` is in `.gitignore`
- **Fix:** Never commit `.env` files with real keys

## Database Schema

The schema includes:
- ✅ All tables from Prisma schema
- ✅ Proper indexes for performance
- ✅ Foreign key relationships
- ✅ Row Level Security (RLS) enabled
- ✅ RLS policies for data access control

## Testing

Use the test file: `src/lib/testSupabase.ts`

```typescript
import { addUser, getUsers } from '@/lib/testSupabase';

// Add a test user
await addUser();

// Get all users
await getUsers();
```

## Production Checklist

Before going to production:

1. ✅ Remove testing policy from `002_rls_policies.sql`:
   ```sql
   -- Remove this policy:
   CREATE POLICY "Allow all for testing - REMOVE IN PRODUCTION"
   ```

2. ✅ Update RLS policies for production security
3. ✅ Set up proper authentication with Supabase Auth
4. ✅ Use service role key only on backend (never in frontend)
5. ✅ Enable additional security features in Supabase Dashboard

## Next Steps

1. Set up Supabase Authentication
2. Create API routes using Supabase client
3. Implement proper user authentication
4. Add file upload for avatars/content using Supabase Storage

