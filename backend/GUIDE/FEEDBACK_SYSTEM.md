# Feedback System Documentation

## Overview

The feedback system allows users to submit bug reports, feature requests, and general feedback directly from the application. Screenshots are automatically uploaded to S3/R2 storage.

## Features

✅ **In-App Feedback Widget**
- Fixed floating button (bottom-right)
- Modal with feedback form
- Three feedback types: Bug Report, Feature Request, General Feedback
- Screenshot upload (optional)
- Works for both authenticated and anonymous users

✅ **Backend API**
- POST `/api/feedback` - Submit feedback
- POST `/api/feedback/screenshot` - Upload screenshot to S3/R2
- GET `/api/feedback` - Get user's feedback (authenticated)
- GET `/api/feedback/:id` - Get specific feedback
- PATCH `/api/feedback/:id/status` - Update status (admin only)

✅ **Database Model**
- Stores feedback with metadata
- Tracks status: new, in_progress, resolved, won't_fix
- Links to user (optional - supports anonymous feedback)

## Database Schema

```prisma
model Feedback {
  id        String    @id @default(cuid())
  userId    String?   // Optional - supports anonymous feedback
  type      String    // bug_report, feature_request, general_feedback
  message   String    @db.Text
  screenshot String?  // URL to uploaded screenshot (S3/R2)
  url       String?   // URL where feedback was submitted
  userAgent String?   // Browser user agent
  status    String    @default("new") // new, in_progress, resolved, won't_fix
  metadata  Json?     // Additional context (browser, device, screen size, etc.)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User?     @relation(fields: [userId], references: [id])
}
```

## Frontend Component

**Location:** `frontend/src/components/feedback/FeedbackWidget.tsx`

**Features:**
- Modern UI with gradient button
- Visual feedback type selection (cards)
- Textarea for message (10-5000 characters)
- File upload for screenshots (max 5MB, images only)
- Screenshot preview
- Automatic screenshot upload to S3/R2
- Toast notifications for success/error
- Responsive design

**Usage:**
```tsx
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';

// Already integrated in App.tsx
<FeedbackWidget />
```

## Backend Routes

### POST `/api/feedback/screenshot`
Upload screenshot for feedback.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with `screenshot` field (File)
- Auth: Optional (works for anonymous users)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/feedback/screenshot-123.jpg"
  }
}
```

### POST `/api/feedback`
Submit feedback.

**Request:**
```json
{
  "type": "bug_report" | "feature_request" | "general_feedback",
  "message": "Feedback message (10-5000 characters)",
  "screenshot": "https://cdn.example.com/feedback/screenshot.jpg", // Optional
  "url": "https://example.com/page", // Optional - auto-captured
  "metadata": { // Optional - auto-collected
    "browser": "Mozilla/5.0...",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "viewportWidth": 1440,
    "viewportHeight": 900
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "type": "bug_report",
    "message": "Feedback message",
    "status": "new",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Thank you for your feedback!"
}
```

### GET `/api/feedback`
Get user's feedback (authenticated only).

**Query Parameters:**
- `status` - Filter by status (new, in_progress, resolved, won't_fix)
- `type` - Filter by type
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "type": "bug_report",
      "message": "Feedback message",
      "screenshot": "https://...",
      "url": "https://...",
      "status": "new",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### GET `/api/feedback/:id`
Get specific feedback (user's own or admin).

### PATCH `/api/feedback/:id/status`
Update feedback status (admin only).

**Request:**
```json
{
  "status": "in_progress" | "resolved" | "won't_fix"
}
```

## Screenshot Upload Flow

1. User selects screenshot file
2. File is validated (image type, max 5MB)
3. Preview shown in widget
4. On submit, screenshot uploaded to S3/R2 via `/api/feedback/screenshot`
5. Returns CDN URL
6. URL included in feedback submission
7. Screenshot stored in `feedback/` folder in S3/R2

## Feedback Types

1. **Bug Report** (`bug_report`)
   - For reporting errors, bugs, or issues
   - Icon: AlertCircle
   - Color: Red

2. **Feature Request** (`feature_request`)
   - For suggesting new features
   - Icon: Lightbulb
   - Color: Yellow

3. **General Feedback** (`general_feedback`)
   - For general comments and suggestions
   - Icon: MessageCircle
   - Color: Blue

## Status Workflow

- **new** - Initial status when feedback is submitted
- **in_progress** - Feedback is being reviewed/addressed
- **resolved** - Feedback has been addressed
- **won't_fix** - Feedback won't be addressed (with reason)

## Metadata Collection

The system automatically collects:
- Browser user agent
- Current page URL
- Screen dimensions
- Viewport dimensions
- Timestamp
- IP address (server-side)
- User ID (if authenticated)

## Rate Limiting

- User rate limit: 100 requests/minute
- Applies to all feedback endpoints
- Prevents spam and abuse

## Security

- File upload validation (type and size)
- Rate limiting
- Optional authentication (supports anonymous feedback)
- Input validation with Zod schemas
- XSS protection via input sanitization

## Admin Features

Admins can:
- View all feedback (not just their own)
- Update feedback status
- See full metadata including IP address
- View user information for feedback

## Integration

The FeedbackWidget is already integrated in `App.tsx`:
```tsx
<Suspense fallback={null}>
  <FeedbackWidget />
</Suspense>
```

It appears on all pages as a floating button in the bottom-right corner.

## Testing

### Test Feedback Submission

```bash
# Submit feedback
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug_report",
    "message": "Test feedback message with at least 10 characters",
    "url": "https://example.com/page"
  }'
```

### Test Screenshot Upload

```bash
# Upload screenshot
curl -X POST http://localhost:3001/api/feedback/screenshot \
  -F "screenshot=@screenshot.png"
```

## Future Enhancements

- [ ] Feedback analytics dashboard
- [ ] Email notifications for feedback status updates
- [ ] Feedback voting/prioritization
- [ ] Integration with issue tracking (GitHub Issues, Jira)
- [ ] Feedback search and filtering
- [ ] Bulk status updates
- [ ] Feedback templates
- [ ] Rich text editor for feedback messages

---

**Last Updated:** [Date]
**Maintained By:** Engineering Team

