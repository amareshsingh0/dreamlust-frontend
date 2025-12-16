# Fix CI Test Issue - Backend Repo Frontend Folder

## Problem

The CI is running from `dreamlust-backend` repo which has a `frontend` folder with old code that still has:
```typescript
expect.extend(toHaveNoViolations);
```

This causes the error: `TypeError: Cannot convert undefined or null to object`

## Solution

The `dreamlust-backend` repo on GitHub has a `frontend` folder that needs to be updated with the fix.

### Option 1: Update Frontend Folder in Backend Repo (Recommended)

1. **Clone the backend repo:**
   ```bash
   git clone https://github.com/amareshsingh0/dreamlust-backend.git
   cd dreamlust-backend
   ```

2. **Copy the fixed files from frontend repo:**
   ```bash
   # Copy from dreamlust-frontend repo
   cp ../dreamlust-frontend/src/test/setup.ts frontend/src/test/setup.ts
   cp ../dreamlust-frontend/src/test/a11y.tsx frontend/src/test/a11y.tsx
   ```

3. **Commit and push:**
   ```bash
   git add frontend/src/test/setup.ts frontend/src/test/a11y.tsx
   git commit -m "Fix vitest-axe import issue in frontend tests"
   git push origin main
   ```

### Option 2: Update CI Workflow to Use Frontend Repo

If the frontend folder shouldn't be in the backend repo, update the GitHub Actions workflow to:
- Checkout the `dreamlust-frontend` repo instead
- Or remove the frontend folder from backend repo

### Option 3: Remove Frontend Folder from Backend Repo

If the frontend folder shouldn't exist in the backend repo:

```bash
cd dreamlust-backend
git rm -r frontend
git commit -m "Remove frontend folder - use separate frontend repo"
git push origin main
```

Then update CI workflow to checkout both repos.

## Current Status

- ✅ **Frontend repo (`dreamlust-frontend`)**: Fixed and pushed
- ❌ **Backend repo (`dreamlust-backend`)**: Frontend folder still has old code
- ❌ **CI**: Running from backend repo, using old code

## Quick Fix Command

If you have both repos cloned locally:

```bash
# From dreamlust-project root
cd backend
git pull origin main
cp ../frontend/src/test/setup.ts frontend/src/test/setup.ts
cp ../frontend/src/test/a11y.tsx frontend/src/test/a11y.tsx
git add frontend/src/test/setup.ts frontend/src/test/a11y.tsx
git commit -m "Fix vitest-axe import issue in frontend tests"
git push origin main
```

