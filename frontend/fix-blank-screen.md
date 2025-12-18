# Blank Screen Fix - Step by Step

## Problem
Blank white screen at `localhost:4173`

## Solution

### Step 1: Build the Frontend
```bash
cd frontend
bun run build
```

**Wait for build to complete!** You should see:
```
✓ built in XXXms
```

### Step 2: Check Build Output
```bash
# Check if dist folder exists
ls dist

# Should see:
# - index.html
# - assets/ (folder with JS and CSS files)
```

### Step 3: Start Preview Server
```bash
bun run preview
```

### Step 4: Open Browser
Open `http://localhost:4173` in browser

### Step 5: Check Browser Console
Press **F12** → **Console** tab

**Look for:**
- ✅ `🚀 Main.tsx loaded` - App is loading
- ✅ `✅ Root element found` - HTML is correct
- ✅ `✅ App rendered successfully!` - Everything works

**If you see errors:**
- ❌ `Root element not found` - Check index.html
- ❌ `Failed to render app` - Check the error message
- ❌ `Cannot find module` - Missing dependency

### Step 6: Common Fixes

#### Fix 1: Rebuild
```bash
rm -rf dist
bun run build
```

#### Fix 2: Clear Cache
```bash
# Clear node_modules and reinstall
rm -rf node_modules
bun install
bun run build
```

#### Fix 3: Check Dependencies
```bash
bun install
```

#### Fix 4: Check for Errors
```bash
# TypeScript check
bun run typecheck

# Lint check
bun run lint
```

## Quick Test

I've added better error logging to `main.tsx`. Now when you:

1. **Build:** `bun run build`
2. **Preview:** `bun run preview`
3. **Open browser:** `http://localhost:4173`
4. **Check console:** F12 → Console

You'll see detailed logs showing exactly where the problem is!

## What I Fixed

1. ✅ Added error logging to `main.tsx`
2. ✅ Added root element check
3. ✅ Added global error handlers
4. ✅ Added try-catch around render
5. ✅ Added fallback error UI

Now the app will show you exactly what's wrong instead of just a blank screen!

