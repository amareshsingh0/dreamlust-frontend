# PWA Icons Setup

The PWA manifest requires icon files for proper installation. Currently, placeholder icons are referenced but not present.

## Required Icons

1. **icon-192.png** - 192x192 pixels (for Android home screen)
2. **icon-512.png** - 512x512 pixels (for Android splash screen)

## Quick Setup

You can create these icons using:

1. **Online Tools:**
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - https://favicon.io/

2. **Design Requirements:**
   - Square images (192x192 and 512x512)
   - PNG format
   - Transparent background recommended
   - Simple, recognizable logo/icon
   - High contrast for visibility

3. **Place Files:**
   - Save as `icon-192.png` and `icon-512.png` in `frontend/public/` directory

## Temporary Solution

Until icons are created, the manifest will fall back to `favicon.ico`. The PWA will still work, but installation prompts may show a generic icon.

## Testing

After adding icons:
1. Clear browser cache
2. Unregister service worker (DevTools > Application > Service Workers)
3. Reload the page
4. Check manifest in DevTools > Application > Manifest

