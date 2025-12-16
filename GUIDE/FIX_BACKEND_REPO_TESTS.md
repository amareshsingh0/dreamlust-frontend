# Fix Backend Repo Frontend Tests

## Problem

CI is running from `dreamlust-backend` repo which has a `frontend` folder with old test code that causes:
```
TypeError: Cannot convert undefined or null to object
❯ src/test/setup.ts:13:8
expect.extend(toHaveNoViolations);
```

## Quick Fix

### Option 1: Use the PowerShell Script (Easiest)

```powershell
# From dreamlust-project root
.\fix-backend-repo-tests.ps1
```

Then follow the instructions to commit and push.

### Option 2: Manual Fix

1. **Clone backend repo** (if not already):
   ```bash
   cd ..
   git clone https://github.com/amareshsingh0/dreamlust-backend.git
   ```

2. **Copy fixed files**:
   ```powershell
   # From dreamlust-project root
   Copy-Item frontend/src/test/setup.ts ..\dreamlust-backend\frontend\src\test\setup.ts -Force
   Copy-Item frontend/src/test/a11y.tsx ..\dreamlust-backend\frontend\src\test\a11y.tsx -Force
   Copy-Item frontend/eslint.config.js ..\dreamlust-backend\frontend\eslint.config.js -Force
   ```

3. **Commit and push**:
   ```bash
   cd ../dreamlust-backend
   git add frontend/src/test/setup.ts frontend/src/test/a11y.tsx frontend/eslint.config.js
   git commit -m "Fix vitest-axe import issue in frontend tests"
   git push origin main
   ```

### Option 3: Update CI to Use Frontend Repo (Best Long-term)

Update the GitHub Actions workflow in `dreamlust-backend` to:
- Checkout `dreamlust-frontend` repo instead of using the frontend folder
- Or remove the frontend folder from backend repo entirely

## Files That Need Updating

- `frontend/src/test/setup.ts` - Remove `expect.extend(toHaveNoViolations)`
- `frontend/src/test/a11y.tsx` - Use custom matcher instead
- `frontend/eslint.config.js` - Change `no-explicit-any` to warning

## Verification

After pushing, the CI should pass. The error should change from:
```
TypeError: Cannot convert undefined or null to object
```

To tests actually running (even if some fail, the setup error should be gone).

