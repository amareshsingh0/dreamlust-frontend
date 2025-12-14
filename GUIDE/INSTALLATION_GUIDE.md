# 📍 Supabase Installation Guide

## ✅ WHERE to Install (IMPORTANT)

### 🟦 Frontend (MOST COMMON) ✅

**If your frontend talks to Supabase directly:**

```powershell
cd frontend
bun add @supabase/supabase-js
```

**✅ This is the correct place for most apps.**

**Status:** ✅ Already installed in `frontend/package.json`

**Client File:** `frontend/src/lib/supabaseClient.ts`

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

**Status:** ✅ Already installed in `backend/package.json` (for admin operations)

**Admin File:** `backend/src/lib/supabaseAdmin.ts`

### ❌ Do NOT run it here

- ❌ Project root
- ❌ Both frontend + backend unless you know why
- ❌ With npm if you're using Bun (use `bun add` instead)

## 🧠 Bun Equivalents

| npm | bun |
|-----|-----|
| `npm install` | `bun add` |
| `npx` | `bunx` |
| `npm run` | `bun run` |

## ✅ After Installing (Frontend)

**Client file already created:** `frontend/src/lib/supabaseClient.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**JavaScript version also available:** `frontend/src/lib/supabaseClient.js`

**Restart dev server:**
```powershell
cd frontend
bun run dev
```

## 🧪 Quick Test

**Test function available:** `frontend/src/lib/testSupabase.ts`

```typescript
import { quickTest } from '@/lib/testSupabase';

// Quick test
const { data, error } = await quickTest();
console.log(data, error);
```

**Or use directly:**
```typescript
import { supabase } from '@/lib/supabaseClient';

const { data, error } = await supabase
  .from("content")
  .select("*");
console.log(data, error);
```

## 📁 Current File Structure

```
frontend/
├─ src/
│  └─ lib/
│     ├─ supabaseClient.ts    ✅ TypeScript version
│     ├─ supabaseClient.js    ✅ JavaScript version
│     └─ testSupabase.ts      ✅ Test functions
└─ package.json               ✅ Has @supabase/supabase-js

backend/
├─ src/
│  └─ lib/
│     └─ supabaseAdmin.ts     ✅ Admin client (service key)
└─ package.json               ✅ Has @supabase/supabase-js
```

## ✅ Verification

- [x] Frontend has `@supabase/supabase-js` installed
- [x] Backend has `@supabase/supabase-js` installed (for admin)
- [x] Frontend client file: `frontend/src/lib/supabaseClient.ts`
- [x] Frontend client file (JS): `frontend/src/lib/supabaseClient.js`
- [x] Backend admin file: `backend/src/lib/supabaseAdmin.ts`
- [x] Test functions: `frontend/src/lib/testSupabase.ts`
- [x] Using `bun add` (not npm)

## 🎯 Summary

**Your setup is already correct! ✅**

- ✅ Frontend: Supabase client installed and configured
- ✅ Backend: Supabase admin installed for server-side operations
- ✅ Both use `bun add` (correct package manager)
- ✅ Files are in the correct locations
- ✅ Environment variables configured

**No additional installation needed!** You're ready to use Supabase. 🚀

