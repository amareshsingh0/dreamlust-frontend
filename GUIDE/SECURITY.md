# Security Best Practices

## 🔐 Database Credentials & API Keys

### ✅ CORRECT: Supabase API Keys (Frontend Safe)

**Supabase uses API keys, NOT database passwords.**

```typescript
// ✅ SAFE for frontend - This is an API key, not a DB password
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  // Anon key is safe for frontend
```

**Why it's safe:**
- Anon key is designed for frontend use
- Protected by Row Level Security (RLS) policies
- Limited permissions based on RLS rules
- Can be exposed in client-side code

### ❌ WRONG: Database Passwords (Backend Only)

**NEVER put database passwords in frontend code!**

```typescript
// ❌ NEVER in frontend - This is a database password!
DATABASE_URL="postgresql://user:password@host:5432/db"
```

**Why it's dangerous:**
- Full database access
- Can bypass all security
- Anyone can see it in browser DevTools
- Can delete/modify all data

## Simple Rule to Remember

```
Supabase JS = API keys (✅ Frontend OK)
Direct PostgreSQL = DB password (❌ Backend ONLY)
```

## Best Practices

### 1. ✅ Save DB Password in Password Manager
- Use 1Password, LastPass, Bitwarden, etc.
- Never store in code or config files
- Share securely with team members only

### 2. ❌ Don't Put DB Password in Frontend
- Frontend code is visible to everyone
- Use Supabase client (API keys) instead
- Or create backend API endpoints

### 3. ❌ Don't Commit DB Password to GitHub
- Add `.env` to `.gitignore` ✅ (Already done)
- Never commit `.env` files
- Use `.env.example` for documentation

## Current Project Setup

### Frontend (Safe ✅)
```typescript
// src/lib/supabaseClient.ts
// Uses API keys - Safe for frontend
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Backend (If Needed)
```typescript
// Backend only - Never in frontend!
DATABASE_URL="postgresql://user:password@host/db"
```

## Environment Variables Structure

### `.env` file (NEVER commit):
```env
# Supabase API Keys (Frontend Safe)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Database Password (Backend Only - if using Prisma directly)
DATABASE_URL=postgresql://user:password@host:5432/db
```

### `.env.example` file (Safe to commit):
```env
# Supabase API Keys
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Database Password (Backend Only)
DATABASE_URL=postgresql://user:password@host:5432/db
```

## What's in This Project

### ✅ Safe for Frontend
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon API key

### ⚠️ Backend Only (if using Prisma)
- `DATABASE_URL` - Direct PostgreSQL connection
  - Only use in backend API routes
  - Never import in frontend components
  - Currently in `src/lib/prisma.ts` - **Move to backend if used**

## Checklist

- [x] `.env` added to `.gitignore`
- [x] Supabase uses API keys (safe for frontend)
- [x] Database password stored securely (not in code)
- [ ] Create `.env.example` for documentation
- [ ] Move Prisma client to backend (if using direct DB connection)

## If You Accidentally Committed Secrets

1. **Immediately rotate/change the credentials**
2. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push (coordinate with team first!)**
4. **Update `.gitignore` to prevent future commits**

## Additional Resources

- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [GitHub Secrets Scanning](https://docs.github.com/en/code-security/secret-scanning)

