import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  streamId?: string;
}

interface ChatMessage {
  streamId: string;
  message: string;
}

interface JoinStreamData {
  streamId: string;
}

// Store active viewer counts per stream
const streamViewers = new Map<string, Set<string>>();

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        env.FRONTEND_URL,
        'http://localhost:4001',
        'http://localhost:4000',
        'http://localhost:3000',
        'http://127.0.0.1:4001',
        'http://127.0.0.1:4000',
        'http://127.0.0.1:3000',
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        // Allow anonymous connections but mark them
        return next();
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & { userId: string };
        socket.userId = decoded.userId;
      } catch (error) {
        // Invalid token, but allow connection (anonymous)
        console.warn('Invalid token for socket connection:', error);
      }

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a stream room
    socket.on('join-stream', async (data: JoinStreamData) => {
      const { streamId } = data;

      if (!streamId) {
        socket.emit('error', { message: 'Stream ID is required' });
        return;
      }

      try {
        // Verify stream exists and is live
        const stream = await prisma.liveStream.findUnique({
          where: { id: streamId },
        });

        if (!stream) {
          socket.emit('error', { message: 'Stream not found' });
          return;
        }

        if (stream.status !== 'live') {
          socket.emit('error', { message: 'Stream is not live' });
          return;
        }

        // Join the stream room
        socket.join(`stream:${streamId}`);
        socket.streamId = streamId;

        // Track viewer
        if (!streamViewers.has(streamId)) {
          streamViewers.set(streamId, new Set());
        }
        streamViewers.get(streamId)!.add(socket.id);

        // Update viewer count in database
        const viewerCount = streamViewers.get(streamId)!.size;
        await prisma.liveStream.update({
          where: { id: streamId },
          data: {
            viewer_count: viewerCount,
            peak_viewer_count: stream.peak_viewer_count < viewerCount 
              ? viewerCount 
              : stream.peak_viewer_count,
          },
        });

        // Broadcast updated viewer count
        io.to(`stream:${streamId}`).emit('viewer-count-update', {
          streamId,
          viewerCount,
        });

        socket.emit('joined-stream', { streamId });
        console.log(`Socket ${socket.id} joined stream ${streamId}`);
      } catch (error) {
        console.error('Error joining stream:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    // Send chat message
    socket.on('send-message', async (data: ChatMessage) => {
      const { streamId, message } = data;

      if (!streamId || !message) {
        socket.emit('error', { message: 'Stream ID and message are required' });
        return;
      }

      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }

      if (message.trim().length === 0 || message.length > 500) {
        socket.emit('error', { message: 'Message must be between 1 and 500 characters' });
        return;
      }

      try {
        // Verify stream exists and is live
        const stream = await prisma.liveStream.findUnique({
          where: { id: streamId },
        });

        if (!stream) {
          socket.emit('error', { message: 'Stream not found' });
          return;
        }

        if (stream.status !== 'live') {
          socket.emit('error', { message: 'Stream is not live' });
          return;
        }

        if (!stream.chat_enabled) {
          socket.emit('error', { message: 'Chat is disabled for this stream' });
          return;
        }

        // Get user info
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
          },
        });

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Create chat message
        const chatMessage = await prisma.liveChatMessage.create({
          data: {
            stream_id: streamId,
            user_id: socket.userId,
            message: message.trim(),
          },
        });

        // Broadcast message to all viewers in the stream room
        const messageData = {
          id: chatMessage.id,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp.toISOString(),
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar,
          },
        };

        io.to(`stream:${streamId}`).emit('new-message', messageData);
        console.log(`Message sent in stream ${streamId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Leave stream
    socket.on('leave-stream', async (data: { streamId: string }) => {
      const { streamId } = data;
      
      if (streamId && socket.streamId === streamId) {
        socket.leave(`stream:${streamId}`);
        
        // Remove viewer tracking
        if (streamViewers.has(streamId)) {
          streamViewers.get(streamId)!.delete(socket.id);
          const viewerCount = streamViewers.get(streamId)!.size;

          // Update viewer count in database
          try {
            await prisma.liveStream.update({
              where: { id: streamId },
              data: {
                viewer_count: Math.max(0, viewerCount),
              },
            });

            // Broadcast updated viewer count
            io.to(`stream:${streamId}`).emit('viewer-count-update', {
              streamId,
              viewerCount,
            });
          } catch (error) {
            console.error('Error updating viewer count:', error);
          }
        }

        socket.streamId = undefined;
        console.log(`Socket ${socket.id} left stream ${streamId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const streamId = socket.streamId;

      if (streamId) {
        // Remove viewer tracking
        if (streamViewers.has(streamId)) {
          streamViewers.get(streamId)!.delete(socket.id);
          const viewerCount = streamViewers.get(streamId)!.size;

          // Update viewer count in database
          try {
            await prisma.liveStream.update({
              where: { id: streamId },
              data: {
                viewer_count: Math.max(0, viewerCount),
              },
            });

            // Broadcast updated viewer count
            io.to(`stream:${streamId}`).emit('viewer-count-update', {
              streamId,
              viewerCount,
            });
          } catch (error) {
            console.error('Error updating viewer count on disconnect:', error);
          }
        }

        socket.leave(`stream:${streamId}`);
        console.log(`Socket ${socket.id} disconnected from stream ${streamId}`);
      } else {
        console.log(`Socket ${socket.id} disconnected`);
      }
    });
  });

  return io;
}
