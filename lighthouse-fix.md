# Lighthouse Blank Screen Fix

## Problem
Lighthouse shows blank white screen when testing.

## Quick Fix Steps

### Step 1: Build the Frontend First
```bash
cd frontend
bun run build
```

**Important:** Make sure build completes without errors!

### Step 2: Test Preview Server Manually
```bash
bun run preview
```

Then open `http://localhost:4173` in your browser.

**If you see blank screen:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab - are files loading?

### Step 3: Check Common Issues

#### Issue 1: Build Failed
**Solution:** Fix build errors first
```bash
bun run build
# Look for errors and fix them
```

#### Issue 2: JavaScript Errors
**Solution:** Check browser console
- Open `http://localhost:4173`
- Press F12 → Console tab
- Look for red errors
- Fix the errors

#### Issue 3: API Not Running
**Solution:** Start backend server
```bash
# Terminal 1
cd backend
bun run dev

# Terminal 2  
cd frontend
bun run preview
```

#### Issue 4: Missing Environment Variables
**Solution:** Create `.env` file
```bash
# frontend/.env
VITE_API_URL=http://localhost:3001
```

### Step 4: Run Lighthouse with Better Config

I've updated `.lighthouserc.json` with:
- ✅ Increased timeout to 120 seconds
- ✅ Added 5 second wait after server starts
- ✅ Better server ready patterns
- ✅ Chrome flags for headless mode

### Step 5: Test Script

Use the test script I created:
```bash
cd frontend
bun run test:preview
```

This will:
1. Build the frontend
2. Start preview server
3. Show you if it works

## Manual Lighthouse Test

If automatic test fails:

1. **Start preview manually:**
   ```bash
   cd frontend
   bun run build
   bun run preview
   ```

2. **In another terminal, test with Lighthouse CLI:**
   ```bash
   npx lighthouse http://localhost:4173 --view --chrome-flags="--headless"
   ```

## Updated Configuration

I've updated:
- ✅ `.lighthouserc.json` - Better timeout and wait times
- ✅ `vite.config.ts` - Preview server configuration
- ✅ Created `test-preview.js` - Test script
- ✅ Created troubleshooting guide

## Next Steps

1. **Build first:** `bun run build`
2. **Test preview:** `bun run test:preview` or `bun run preview`
3. **Check browser:** Open `http://localhost:4173` manually
4. **Fix errors:** If blank, check browser console
5. **Run Lighthouse:** `bun run lighthouse`

## If Still Blank

Check these:
- ✅ Build completed successfully?
- ✅ Preview server running on port 4173?
- ✅ Browser console shows errors?
- ✅ Network tab shows files loading?
- ✅ Backend API running (if needed)?

