# Lighthouse Blank Screen Troubleshooting

## Problem
Lighthouse shows blank white screen when running tests.

## Common Causes & Solutions

### 1. Build Not Complete
**Solution:** Make sure build completes successfully
```bash
cd frontend
bun run build
```

Check for errors in the build output. If there are errors, fix them first.

### 2. Preview Server Not Starting
**Solution:** Test preview server manually
```bash
cd frontend
bun run build
bun run preview
```

Then open `http://localhost:4173` in browser manually to verify it works.

### 3. JavaScript Errors
**Solution:** Check browser console for errors
1. Open `http://localhost:4173` in browser
2. Open DevTools (F12)
3. Check Console tab for errors
4. Fix any JavaScript errors

### 4. API Connection Issues
**Solution:** The app might need backend API running
```bash
# Terminal 1: Start backend
cd backend
bun run dev

# Terminal 2: Start frontend preview
cd frontend
bun run build
bun run preview
```

### 5. Missing Environment Variables
**Solution:** Check if VITE_API_URL is needed
```bash
# In frontend/.env (if exists)
VITE_API_URL=http://localhost:3001
```

### 6. Lighthouse Timeout
**Solution:** Increase timeout in `.lighthouserc.json`
Already updated to 120 seconds and 5 second wait.

## Step-by-Step Fix

### Step 1: Build the Frontend
```bash
cd frontend
bun run build
```

**Expected Output:**
```
✓ 2681 modules transformed.
dist/index.html
dist/assets/...
```

### Step 2: Test Preview Server Manually
```bash
bun run preview
```

**Expected Output:**
```
  VITE v7.3.0  ready in XXX ms

  ➜  Local:   http://localhost:4173/
  ➜  Network: use --host to expose
```

Open `http://localhost:4173` in browser - it should show the app, not blank screen.

### Step 3: Check Browser Console
1. Open `http://localhost:4173` in browser
2. Press F12 to open DevTools
3. Check Console tab for errors

**Common Errors:**
- `Failed to fetch` - Backend API not running
- `Cannot read property X` - JavaScript error
- `Module not found` - Build issue

### Step 4: Run Lighthouse
```bash
# Make sure preview server is NOT running manually
# Lighthouse will start it automatically
bun run lighthouse
```

## Quick Test Script

Create `frontend/test-preview.js`:
```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testPreview() {
  console.log('🔨 Building frontend...');
  try {
    await execAsync('bun run build', { cwd: process.cwd() });
    console.log('✅ Build successful');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }

  console.log('\n🚀 Starting preview server...');
  const preview = exec('bun run preview', { cwd: process.cwd() });
  
  preview.stdout.on('data', (data) => {
    console.log(data.toString());
    if (data.toString().includes('Local:')) {
      console.log('\n✅ Preview server started successfully!');
      console.log('🌐 Open http://localhost:4173 in browser to test');
      console.log('Press Ctrl+C to stop');
    }
  });

  preview.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  // Auto-stop after 30 seconds for testing
  setTimeout(() => {
    preview.kill();
    process.exit(0);
  }, 30000);
}

testPreview();
```

Run:
```bash
cd frontend
bun run test-preview.js
```

## Updated Lighthouse Config

I've updated `.lighthouserc.json` with:
- Increased timeout to 120 seconds
- Added 5 second wait after server starts
- Better server ready patterns

## Manual Lighthouse Test

If automatic test fails, run manually:

1. **Start preview server:**
   ```bash
   cd frontend
   bun run build
   bun run preview
   ```

2. **In another terminal, run Lighthouse:**
   ```bash
   npx lighthouse http://localhost:4173 --view
   ```

This will:
- Test the homepage
- Open results in browser
- Show detailed performance metrics

## Still Having Issues?

1. **Check build output for errors**
2. **Test preview server manually** - does it show the app?
3. **Check browser console** - any JavaScript errors?
4. **Verify backend is running** - if app needs API
5. **Check network tab** - are assets loading?

## Expected Behavior

When working correctly:
- Preview server starts on port 4173
- Browser shows the app (not blank)
- Lighthouse can access the page
- Performance scores are calculated

If you see blank screen:
- Check browser console for errors
- Verify build completed successfully
- Test preview server manually first

