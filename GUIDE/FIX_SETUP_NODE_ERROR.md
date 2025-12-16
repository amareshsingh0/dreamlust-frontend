# Fix: setup-node@v4 cache npm Error

## Problem
GitHub Actions is failing with:
```
Error: Dependencies lock file is not found in /home/runner/work/dreamlust-frontend/dreamlust-frontend. 
Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

This happens because `actions/setup-node@v4` is configured with `cache: npm`, but the project uses **Bun**, not npm. Bun uses `bun.lockb` (binary lockfile), not `package-lock.json`.

## Solution

### Option 1: Replace setup-node with setup-bun (Recommended)

Find any workflow file in `.github/workflows/` that uses `setup-node` and replace it:

**Before:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

**After:**
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
```

### Option 2: Remove cache option

If you must use Node.js for some reason, remove the `cache` option:

**Before:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # ❌ Remove this
```

**After:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    # No cache option - Bun doesn't use npm lockfiles
```

### Option 3: Use Bun cache (if available)

Some Bun setup actions support caching:

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
    cache: true  # If supported by the action
```

## Files to Check

Check these workflow files in the `dreamlust-frontend` repository:

1. `.github/workflows/ci.yml`
2. `.github/workflows/test.yml`
3. `.github/workflows/build.yml`
4. `.github/workflows/deploy.yml`
5. Any other workflow files in `.github/workflows/`

## Quick Fix Script

If you have access to the `dreamlust-frontend` repo locally:

```bash
cd dreamlust-frontend
# Find all workflow files with setup-node
grep -r "setup-node" .github/workflows/

# Replace setup-node with setup-bun in all workflow files
find .github/workflows -name "*.yml" -o -name "*.yaml" | xargs sed -i 's/actions\/setup-node@v4/oven-sh\/setup-bun@v1/g'
find .github/workflows -name "*.yml" -o -name "*.yaml" | xargs sed -i 's/node-version:.*/bun-version: latest/g'
find .github/workflows -name "*.yml" -o -name "*.yaml" | xargs sed -i '/cache:.*npm/d'
```

## Verification

After fixing, verify the workflow:

1. Check that all `setup-node` references are replaced with `setup-bun`
2. Ensure `cache: npm` is removed
3. Update any `npm install` commands to `bun install --frozen-lockfile`
4. Update any `npm run` commands to `bun run`

## Example Fixed Workflow

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Run tests
        run: bun run test
      
      - name: Build
        run: bun run build
```

## Notes

- **Bun** uses `bun.lockb` (binary lockfile), not `package-lock.json`
- The `setup-node` action's cache feature only works with npm/yarn lockfiles
- Using `setup-bun` is the recommended approach for Bun projects
- The new workflow file at `frontend/.github/workflows/ci.yml` already uses Bun correctly

