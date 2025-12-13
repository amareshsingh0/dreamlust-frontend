# Supabase Setup Guide

## 📍 WHERE to Install Supabase Client

### 🟦 Frontend (MOST COMMON) ✅

**If your frontend talks to Supabase directly (recommended):**

```powershell
cd frontend
bun add @supabase/supabase-js
```

**✅ This is the correct place for most apps.**

**Location:** `frontend/src/lib/supabaseClient.ts` (or `.js`)

**Usage in frontend:**
```typescript
import { supabase } from '@/lib/supabaseClient';

// Query data
const { data, error } = await supabase
  .from('content')
  .select('*');
```

### 🟩 Backend (ONLY if needed)

**Only run in backend if you will:**
- Use Supabase Admin APIs
- Manage users server-side
- Bypass RLS intentionally

```powershell
cd backend
bun add @supabase/supabase-js
```

**⚠️ If you're already using Prisma, you usually don't need this in backend.**

**Location:** `backend/src/lib/supabaseAdmin.ts`

**Usage in backend:**
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Admin operations (bypasses RLS)
const { data } = await supabaseAdmin
  .from('users')
  .select('*');
```

### ❌ Do NOT run it here

- ❌ Project root
- ❌ Both frontend + backend unless you know why
- ❌ With npm if you're using Bun (use `bun add` instead)

## ✅ Current Setup Status

### Frontend ✅
- ✅ `@supabase/supabase-js` installed in `frontend/package.json`
- ✅ Client file: `frontend/src/lib/supabaseClient.ts`
- ✅ Uses anon key (safe for frontend)
- ✅ Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend ✅
- ✅ `@supabase/supabase-js` installed in `backend/package.json`
- ✅ Admin client: `backend/src/lib/supabaseAdmin.ts`
- ✅ Uses service role key (backend only)
- ✅ Environment variables: `SUPABASE_SERVICE_ROLE_KEY`

## 🧠 Bun Equivalents

| npm | bun |
|-----|-----|
| `npm install` | `bun add` |
| `npx` | `bunx` |
| `npm run` | `bun run` |

## 📝 Frontend Client File

**Location:** `frontend/src/lib/supabaseClient.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**JavaScript version also available:** `frontend/src/lib/supabaseClient.js`

## 🧪 Quick Test

After installing and setting up, test the connection:

```typescript
// In any component or test file
import { supabase } from '@/lib/supabaseClient';

// Test query
const testConnection = async () => {
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .limit(5);
  
  console.log("Data:", data);
  console.log("Error:", error);
};

testConnection();
```

Or use the test file: `frontend/src/lib/testSupabase.ts`

## 🔄 After Installing

1. **Restart dev server:**
   ```powershell
   cd frontend
   bun run dev
   ```

2. **Test the connection** using the test file or quick test above

3. **Verify environment variables** are loaded correctly

## 📚 File Structure

```
frontend/
├─ src/
│  └─ lib/
│     ├─ supabaseClient.ts    ✅ Frontend client (anon key)
│     ├─ supabaseClient.js    ✅ JavaScript version
│     └─ testSupabase.ts      ✅ Test functions
└─ package.json               ✅ Has @supabase/supabase-js

backend/
├─ src/
│  └─ lib/
│     └─ supabaseAdmin.ts     ✅ Backend admin (service key)
└─ package.json               ✅ Has @supabase/supabase-js
```

## ✅ Verification Checklist

- [x] Frontend has `@supabase/supabase-js` in `package.json`
- [x] Backend has `@supabase/supabase-js` in `package.json` (for admin)
- [x] Frontend client file exists: `frontend/src/lib/supabaseClient.ts`
- [x] Backend admin file exists: `backend/src/lib/supabaseAdmin.ts`
- [x] Environment variables configured in `.env` files
- [x] Using `bun add` (not `npm install`)

## 🎯 Summary

**Your setup is correct! ✅**

- Frontend uses Supabase client with anon key (safe)
- Backend uses Supabase admin with service role key (backend only)
- Both are properly separated and configured
- All files are in the correct locations

You're ready to use Supabase in your project! 🚀

