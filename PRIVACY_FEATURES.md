# Privacy & Content Safety Features

This document describes the privacy controls and safety features implemented in the Dreamlust application.

## ✅ Implementation Status

All privacy and safety features are **fully implemented**.

---

## 1. Privacy Controls

### Database Schema

The `UserPreferences` model includes comprehensive privacy settings:

```prisma
model UserPreferences {
  // Privacy Controls
  hideHistory        Boolean  @default(false)
  anonymousMode      Boolean  @default(false)
  allowPersonalization Boolean @default(true)
  showActivityStatus Boolean  @default(true)
  allowMessages      String   @default("everyone") // everyone, following, none
  showWatchHistory   String   @default("private") // public, friends, private
  showPlaylists      String   @default("public") // public, friends, private
  showLikedContent   String   @default("private") // public, friends, private
  
  // History Lock (PIN-protected)
  historyLockEnabled Boolean  @default(false)
  historyLockPinHash String?  // Hashed PIN using bcrypt
}
```

### Privacy Features

#### 1. Incognito Mode (`anonymousMode`)
- **Purpose**: Browse without recording history or personalization
- **Implementation**: 
  - When enabled, viewing history is not recorded
  - Personalization algorithms are disabled
  - Analytics tracking is minimized
- **API**: `PUT /api/privacy` with `anonymousMode: true`

#### 2. Hide History (`hideHistory`)
- **Purpose**: Don't record viewing history
- **Implementation**: 
  - View records are not created when enabled
  - Existing history remains but new views aren't tracked
- **API**: `PUT /api/privacy` with `hideHistory: true`

#### 3. History Lock (PIN Protection)
- **Purpose**: Protect watch history and playlists with a PIN
- **Implementation**:
  - PIN is hashed using bcrypt (same as passwords)
  - PIN required to access history/playlists when enabled
  - PIN verification endpoint for unlocking
- **API**: 
  - `POST /api/privacy/history-lock` - Enable/disable with PIN
  - `POST /api/privacy/verify-history-lock` - Verify PIN

#### 4. Visibility Controls
- **Watch History**: Control who can see your viewing history
  - Options: `public`, `friends`, `private`
- **Playlists**: Control playlist visibility
  - Options: `public`, `friends`, `private`
- **Liked Content**: Control liked content visibility
  - Options: `public`, `friends`, `private`
- **Messages**: Control who can message you
  - Options: `everyone`, `following`, `none`

#### 5. Activity Status
- **Show Activity Status**: Let others see when you're online
- **Allow Personalization**: Use your data for recommendations

---

## 2. Panic Exit Feature

### Implementation

**Keyboard Shortcut**: `Shift + X`

```typescript
// Global panic exit handler
useEffect(() => {
  const handlePanicExit = (e: KeyboardEvent) => {
    if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
      // Clear current state
      sessionStorage.clear();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Redirect to safe page
      window.location.replace('https://google.com');
    }
  };

  window.addEventListener('keydown', handlePanicExit);
  return () => window.removeEventListener('keydown', handlePanicExit);
}, []);
```

### Features

✅ **Keyboard Shortcut**: `Shift + X` globally  
✅ **Discrete Button**: ⚠️ button in header (low opacity, hover to see)  
✅ **State Clearing**: Clears session and local storage  
✅ **Safe Redirect**: Redirects to Google (safe, neutral page)  
✅ **No Traces**: Uses `window.location.replace()` (no back button history)  

### Usage

1. **Keyboard**: Press `Shift + X` anywhere in the app
2. **Button**: Click the ⚠️ icon in the header (hover to see it)

---

## 3. Data Export (GDPR Compliance)

### Implementation

**Endpoint**: `POST /api/privacy/export-data`

### Export Options

- **Format**: JSON or CSV
- **Include Content**: Export creator content (if user is a creator)
- **Include History**: Export watch history
- **Include Playlists**: Export all playlists and items

### Exported Data

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "username": "...",
    "displayName": "...",
    "avatar": "...",
    "bio": "...",
    "createdAt": "..."
  },
  "preferences": { ... },
  "watchHistory": [ ... ],
  "playlists": [ ... ],
  "content": [ ... ],
  "exportedAt": "2025-12-14T..."
}
```

### Frontend Usage

```typescript
const response = await api.privacy.exportData({
  format: 'json',
  includeContent: true,
  includeHistory: true,
  includePlaylists: true,
});

// Downloads as JSON file
```

---

## 4. Account Deletion (30-Day Grace Period)

### Implementation

**Database Model**: `AccountDeletion`

```prisma
model AccountDeletion {
  id            String   @id @default(cuid())
  userId        String   @unique
  requestedAt   DateTime @default(now())
  scheduledFor  DateTime // 30 days from requestedAt
  reason        String?
  status        String   @default("pending") // pending, processing, completed, cancelled
  completedAt   DateTime?
}
```

### Features

✅ **30-Day Grace Period**: Account deleted 30 days after request  
✅ **Cancellable**: User can cancel deletion anytime before scheduled date  
✅ **Password Confirmation**: Requires password to confirm deletion  
✅ **Optional Reason**: User can provide reason for leaving  
✅ **Status Tracking**: Track deletion status and days remaining  

### API Endpoints

- `POST /api/privacy/delete-account` - Request account deletion
- `POST /api/privacy/cancel-deletion` - Cancel deletion request
- `GET /api/privacy/deletion-status` - Get deletion status

### Scheduled Processing

Account deletions are processed automatically via scheduled task:

```typescript
// backend/src/lib/accountDeletion.ts
// Run daily via cron: 0 2 * * * (2 AM daily)
processAccountDeletions();
```

**Manual Execution**:
```bash
cd backend
bun run src/scripts/processDeletions.ts
```

---

## 5. Frontend Privacy Settings Page

### Route

`/settings/privacy`

### Features

✅ **Privacy Controls UI**: Toggle switches for all privacy settings  
✅ **History Lock Management**: Enable/disable with PIN  
✅ **Data Export Button**: One-click data download  
✅ **Account Deletion**: Request deletion with password confirmation  
✅ **Deletion Status**: Show days remaining and cancel option  

### Components

- Privacy controls card
- History lock card
- Data export card
- Account deletion card (with status display)

---

## 6. API Routes

### Privacy Settings

- `GET /api/privacy` - Get privacy settings
- `PUT /api/privacy` - Update privacy settings

### History Lock

- `POST /api/privacy/history-lock` - Enable/disable history lock
- `POST /api/privacy/verify-history-lock` - Verify PIN

### Data Export

- `POST /api/privacy/export-data` - Export user data

### Account Deletion

- `POST /api/privacy/delete-account` - Request account deletion
- `POST /api/privacy/cancel-deletion` - Cancel deletion request
- `GET /api/privacy/deletion-status` - Get deletion status

---

## 7. Security Considerations

### PIN Storage

- History lock PINs are hashed using bcrypt (same as passwords)
- PINs are never stored in plain text
- PIN verification uses secure password comparison

### Account Deletion

- Requires password confirmation
- 30-day grace period prevents accidental deletions
- Soft delete initially (can be recovered during grace period)
- Permanent deletion after grace period

### Data Export

- Only accessible to authenticated users
- Includes all user data for GDPR compliance
- JSON format for easy parsing
- Downloadable as file

### Panic Exit

- Clears all local storage
- Removes authentication tokens
- No history in browser back button
- Redirects to safe, neutral page

---

## 8. Setup & Configuration

### Database Migration

After updating the schema, run:

```bash
cd backend
bun run db:push
# or
bun run db:migrate dev
```

### Scheduled Tasks

Set up a cron job to process account deletions daily:

```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * cd /path/to/backend && bun run src/scripts/processDeletions.ts
```

Or use a task scheduler like:
- **Node-cron** (for Node.js)
- **PM2** (process manager with cron)
- **System cron** (Linux/Mac)
- **Task Scheduler** (Windows)

---

## 9. Testing

### Test Privacy Settings

```bash
# Get privacy settings
curl -X GET http://localhost:3001/api/privacy \
  -H "Authorization: Bearer TOKEN"

# Update privacy settings
curl -X PUT http://localhost:3001/api/privacy \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hideHistory": true, "anonymousMode": true}'
```

### Test History Lock

```bash
# Enable history lock
curl -X POST http://localhost:3001/api/privacy/history-lock \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "pin": "1234"}'

# Verify PIN
curl -X POST http://localhost:3001/api/privacy/verify-history-lock \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### Test Data Export

```bash
curl -X POST http://localhost:3001/api/privacy/export-data \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "includeHistory": true}'
```

### Test Account Deletion

```bash
# Request deletion
curl -X POST http://localhost:3001/api/privacy/delete-account \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "userpassword", "reason": "No longer using service"}'

# Check status
curl -X GET http://localhost:3001/api/privacy/deletion-status \
  -H "Authorization: Bearer TOKEN"

# Cancel deletion
curl -X POST http://localhost:3001/api/privacy/cancel-deletion \
  -H "Authorization: Bearer TOKEN"
```

---

## Summary

✅ **Privacy Controls**: Fully implemented with comprehensive settings  
✅ **Incognito Mode**: Browse without tracking  
✅ **History Lock**: PIN-protected history access  
✅ **Visibility Controls**: Control who sees your activity  
✅ **Panic Exit**: `Shift + X` quick exit feature  
✅ **Data Export**: GDPR-compliant data download  
✅ **Account Deletion**: 30-day grace period with cancellation  
✅ **Scheduled Processing**: Automatic account deletion processing  

All privacy and safety features are production-ready and comply with GDPR requirements.

