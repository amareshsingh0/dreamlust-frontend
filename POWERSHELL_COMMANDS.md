# PowerShell Commands for Frontend

## Common Commands

### Clean Build (Remove dist and cache)
```powershell
# Remove dist folder
Remove-Item -Recurse -Force dist

# Remove Vite cache
Remove-Item -Recurse -Force node_modules\.vite

# Or both at once
if (Test-Path dist) { Remove-Item -Recurse -Force dist }
if (Test-Path node_modules\.vite) { Remove-Item -Recurse -Force node_modules\.vite }
```

### Build Commands
```powershell
# Clean and build
bun run clean:build

# Or use the script
.\CLEAN_BUILD.ps1

# Regular build
bun run build

# Preview
bun run preview
```

### Quick Clean & Rebuild
```powershell
# One-liner
Remove-Item -Recurse -Force dist, node_modules\.vite -ErrorAction SilentlyContinue; bun run build
```

## PowerShell vs Bash

| Bash (Linux/Mac) | PowerShell (Windows) |
|------------------|----------------------|
| `rm -rf dist` | `Remove-Item -Recurse -Force dist` |
| `rm -rf node_modules/.vite` | `Remove-Item -Recurse -Force node_modules\.vite` |
| `mkdir -p folder` | `New-Item -ItemType Directory -Force folder` |
| `cp -r src dest` | `Copy-Item -Recurse src dest` |
| `ls` | `Get-ChildItem` or `ls` (alias) |

## Using the Clean Build Script

I've created `CLEAN_BUILD.ps1` script for you:

```powershell
# Run the script
.\CLEAN_BUILD.ps1

# Or use npm/bun script
bun run clean
```

This will:
1. ✅ Remove `dist` folder
2. ✅ Remove Vite cache
3. ✅ Build the app
4. ✅ Start preview server

## Quick Fix for React Error

After fixing the React bundling issue:

```powershell
cd frontend

# Clean everything
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# Rebuild
bun run build

# Preview
bun run preview
```

## Error: "A parameter cannot be found"

If you see this error, you're using Unix commands in PowerShell. Use PowerShell syntax instead:

❌ **Wrong:**
```powershell
rm -rf dist
```

✅ **Correct:**
```powershell
Remove-Item -Recurse -Force dist
```

Or use the alias:
```powershell
rm -Recurse -Force dist
```

