# Live Streaming Implementation

## Database Schema

Added two new models to `schema.prisma`:

### LiveStream Model
- Stores live stream information
- Fields: title, description, stream_key, playback_url, status, viewer_count, etc.
- Relations: Creator (many-to-one), LiveChatMessage (one-to-many)

### LiveChatMessage Model
- Stores chat messages for live streams
- Fields: stream_id, user_id, message, timestamp
- Relations: LiveStream (many-to-one)

## Backend Routes (`/api/live`)

### GET `/api/live`
- Get all live streams (public)
- Query params: `status` (live/upcoming/all), `page`, `limit`
- Returns: List of streams with creator info

### GET `/api/live/:id`
- Get specific stream details
- Returns: Stream details (stream key only visible to creator)

### POST `/api/live`
- Create new live stream (creators only)
- Body: title, description, category, tags, scheduledFor, etc.
- Returns: Created stream with stream key

### PUT `/api/live/:id`
- Update stream (creator only)
- Body: title, description, category, tags, etc.

### POST `/api/live/:id/start`
- Start a live stream (creator only)
- Body: playbackUrl (optional)
- Updates status to 'live' and sets started_at

### POST `/api/live/:id/end`
- End a live stream (creator only)
- Body: recordingUrl (optional)
- Updates status to 'ended' and sets ended_at

### POST `/api/live/:id/viewer`
- Increment viewer count (when user joins)
- Updates viewer_count and peak_viewer_count

### DELETE `/api/live/:id/viewer`
- Decrement viewer count (when user leaves)

### GET `/api/live/:id/chat`
- Get chat messages for stream
- Query params: `limit` (default 50)

### POST `/api/live/:id/chat`
- Send chat message (authenticated users)
- Body: message

### DELETE `/api/live/:id`
- Delete stream (creator only, must not be live)

## Frontend Updates

### API Client (`frontend/src/lib/api.ts`)
- Added `api.live.*` methods for all endpoints

### Live Page (`frontend/src/pages/Live.tsx`)
- Updated to fetch real data from API
- Shows live and upcoming streams
- Auto-refreshes every 30 seconds
- Loading states and error handling

## Next Steps

1. **Run Migration**:
   ```bash
   cd backend
   bunx prisma migrate dev --name add_live_streaming
   ```

2. **Create Live Stream Viewer Page**:
   - Page to watch live streams
   - Video player integration
   - Real-time chat component
   - Viewer count updates

3. **Create Live Stream Management Page**:
   - Create/edit streams
   - Start/end streams
   - View stream key for OBS
   - Stream analytics

4. **Integrate Streaming Service**:
   - Connect to Cloudflare Stream, Mux, or similar
   - Generate playback URLs
   - Handle stream key generation

## Notes

- Stream keys are only visible to the creator
- Viewer counts are tracked via API calls
- Chat is optional per stream
- Streams can be scheduled for future dates
- Recordings can be saved as VOD after stream ends
