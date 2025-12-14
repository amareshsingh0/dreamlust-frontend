# Comprehensive Backend Fix Guide

## Root Cause Analysis

### Field Name Inconsistencies

The Prisma schema has **inconsistent field naming**:

1. **Content Model**: Uses camelCase with `@map` to snake_case
   - Model: `viewCount`, `likeCount`, `createdAt`
   - Database: `view_count`, `like_count`, `created_at`
   - **Access**: Use camelCase (`item.viewCount`)

2. **Creator Model**: Uses snake_case directly
   - Model: `display_name`, `is_verified`, `follower_count`
   - Database: `display_name`, `is_verified`, `follower_count`
   - **Access**: Use snake_case (`item.creator.display_name`)

3. **User Model**: Uses snake_case directly
   - Model: `display_name`, `deleted_at`, `created_at`
   - Database: `display_name`, `deleted_at`, `created_at`
   - **Access**: Use snake_case (`user.display_name`)

### Issues Fixed

1. ✅ Server startup error handling
2. ✅ CORS configuration
3. ✅ Prisma field names in SELECT statements
4. ✅ Prisma field names in WHERE clauses
5. ⚠️ Field access patterns (partially fixed)

## Remaining Issues

### Field Access Patterns

When accessing Prisma results:
- **Content fields**: Use camelCase (already correct)
- **Creator fields**: Use snake_case (needs fixing in some places)
- **User fields**: Use snake_case (needs fixing in some places)

### Files That Need Review

1. `backend/src/routes/recommendations.ts` - Accessing `item.viewCount` (correct for Content)
2. `backend/src/routes/tips.ts` - Accessing `tip.fromUser.displayName` (should be `display_name`)
3. `backend/src/routes/comments.ts` - Accessing `comment.createdAt` (check if Comment model uses camelCase)
4. `backend/src/routes/privacy.ts` - Accessing `user.displayName` (should be `display_name`)
5. `backend/src/routes/earnings.ts` - Accessing `item.createdAt` (check model)

## Quick Fix Commands

### 1. Regenerate Prisma Client
```powershell
cd backend
bunx prisma generate
```

### 2. Check for Field Name Issues
```powershell
cd backend
bun run scripts/fix-prisma-fields.ts
```

### 3. Start Server with Better Error Handling
```powershell
cd backend
bun run dev
```

## Server Startup Improvements

The server now:
- ✅ Shows clear error messages for port conflicts
- ✅ Handles graceful shutdown
- ✅ Validates environment variables on startup
- ✅ Shows helpful connection info

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Login endpoint works
- [ ] Recommendations endpoints work
- [ ] No Prisma field name errors in console
- [ ] Frontend can connect to backend
- [ ] CORS allows frontend requests

## Common Errors and Fixes

### Error: "Unknown field `displayName` for select statement"
**Fix**: Use `display_name` in SELECT statements

### Error: "Cannot read property 'displayName' of undefined"
**Fix**: Access as `creator.display_name` (snake_case)

### Error: "Port 3001 is already in use"
**Fix**: Use `.\fix-port.ps1` or kill the process

### Error: "Failed to fetch"
**Fix**: 
1. Check server is running: `Invoke-WebRequest -Uri "http://localhost:3001/health"`
2. Check CORS configuration
3. Hard refresh browser (Ctrl+Shift+R)
