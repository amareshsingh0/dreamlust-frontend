# WebSocket Real-time Chat Implementation

## Overview
Implemented real-time chat functionality using Socket.io for live streams, replacing the previous polling-based approach.

## Backend Implementation

### Socket Server (`backend/src/socket/socketServer.ts`)
- **Authentication**: JWT token-based authentication via socket handshake
- **Events**:
  - `join-stream`: Join a stream room and track viewer count
  - `send-message`: Send chat message (requires authentication)
  - `leave-stream`: Leave stream room and decrement viewer count
  - `disconnect`: Handle disconnection and cleanup
- **Broadcasts**:
  - `new-message`: Broadcast new chat messages to all viewers
  - `viewer-count-update`: Broadcast updated viewer counts
- **Viewer Tracking**: In-memory Set-based tracking per stream

### Server Setup (`backend/src/server.ts`)
- Created HTTP server using `createServer(app)`
- Initialized Socket.io server with CORS configuration
- Socket.io runs on the same port as the Express server

## Frontend Implementation

### Socket Client (`frontend/src/lib/socket.ts`)
- Singleton socket connection management
- Automatic reconnection with exponential backoff
- Token-based authentication
- Connection state management

### LiveChat Component (`frontend/src/components/live/LiveChat.tsx`)
- **Replaced polling with WebSocket**:
  - Real-time message delivery via `new-message` event
  - Instant message broadcasting
  - Connection status indicators
- **Features**:
  - Auto-scroll to latest messages
  - Optimistic message sending
  - Error handling and user feedback
  - Authentication checks

### LiveStreamPage (`frontend/src/pages/LiveStreamPage.tsx`)
- **WebSocket Integration**:
  - Joins stream room on page load (tracks viewer count)
  - Receives real-time viewer count updates
  - Leaves stream room on page unload
- **Status Polling**: Still polls for stream status (every 10s) but viewer count is real-time via WebSocket

## Installation

### Backend
```bash
cd backend
bun add socket.io
```

### Frontend
```bash
cd frontend
bun add socket.io-client
```

## Environment Variables
No additional environment variables required. Uses existing:
- `FRONTEND_URL` for CORS configuration
- `JWT_SECRET` for socket authentication

## Features

### Real-time Chat
- ✅ Instant message delivery
- ✅ No polling overhead
- ✅ Connection status indicators
- ✅ Automatic reconnection
- ✅ Message deduplication

### Viewer Count
- ✅ Real-time updates via WebSocket
- ✅ Automatic tracking on join/leave
- ✅ Peak viewer count tracking
- ✅ Database persistence

### Authentication
- ✅ JWT token authentication
- ✅ Anonymous connections allowed (view-only)
- ✅ Authenticated users can send messages

## Usage

### Joining a Stream
```typescript
const socket = getSocket(token);
socket.emit('join-stream', { streamId: 'stream-id' });
```

### Sending a Message
```typescript
socket.emit('send-message', {
  streamId: 'stream-id',
  message: 'Hello!'
});
```

### Receiving Messages
```typescript
socket.on('new-message', (messageData) => {
  // Handle new message
});
```

### Viewer Count Updates
```typescript
socket.on('viewer-count-update', ({ streamId, viewerCount }) => {
  // Update viewer count display
});
```

## Benefits Over Polling

1. **Lower Latency**: Messages appear instantly
2. **Reduced Server Load**: No constant HTTP requests
3. **Better Scalability**: WebSocket connections are more efficient
4. **Real-time Updates**: Viewer counts update immediately
5. **Better UX**: Connection status visible to users

## Notes

- Socket connections are managed per component
- Automatic cleanup on component unmount
- Reconnection handled automatically by Socket.io client
- Viewer count tracking uses in-memory Sets (consider Redis for production scaling)
