# Quick Fix for Blank Screen

## Run These Commands:

```bash
# 1. Go to frontend directory
cd frontend

# 2. Build the app
bun run build

# 3. Start preview server
bun run preview

# 4. Open browser to http://localhost:4173

# 5. Press F12 and check Console tab for errors
```

## If Still Blank:

1. **Check Console (F12)** - Look for red errors
2. **Check Network Tab** - Are files loading?
3. **Check if backend is running** - App might need API

## Most Common Issue:

**Build not completed or failed!**

Make sure you see:
```
✓ built in XXXms
```

Before running preview!

