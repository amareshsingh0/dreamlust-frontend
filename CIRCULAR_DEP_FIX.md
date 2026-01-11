# Circular Dependency Fix

## Error
```
Uncaught ReferenceError: Cannot access 'D' before initialization
at vendor-other-DguQfa8E.js
```

## Cause
Circular dependency or initialization order issue in `vendor-other` chunk. Some libraries that depend on React are in `vendor-other` instead of `react-vendor`.

## Fix Applied

### 1. Moved More React-Dependent Libraries to react-vendor
- `lucide-react` → `react-vendor` (was in separate chunk)
- `chart.js` and `react-chartjs-2` → `react-vendor`
- Any library with 'react' in name → `react-vendor`

### 2. Added CommonJS Options
```typescript
commonjsOptions: {
  include: [/node_modules/],
  transformMixedEsModules: true,
}
```

This helps handle circular dependencies better.

## Rebuild Steps

```powershell
cd frontend
Remove-Item -Recurse -Force dist, node_modules\.vite -ErrorAction SilentlyContinue
bun run build
bun run preview:force
```

## Expected Result

After rebuild:
- ✅ `react-vendor` chunk will be larger (~400KB) but more stable
- ✅ No circular dependency errors
- ✅ No initialization order issues
- ✅ All React-dependent libs in one chunk

## Why This Works

1. **Single Chunk = No Circular Dependencies**
   - All React code in one file
   - Can't have circular deps between chunks

2. **Proper Initialization Order**
   - React loads first
   - Everything that needs React loads with it
   - No race conditions

3. **CommonJS Transform**
   - Better handling of mixed module types
   - Resolves circular dependencies

## If Still Having Issues

1. **Check what's in vendor-other:**
   - Look at build output
   - If React-dependent libs are there, move them

2. **Full clean rebuild:**
   ```powershell
   Remove-Item -Recurse -Force dist, node_modules\.vite, node_modules -ErrorAction SilentlyContinue
   bun install
   bun run build
   ```

3. **Check for specific library:**
   - If error mentions specific library, move it to react-vendor

