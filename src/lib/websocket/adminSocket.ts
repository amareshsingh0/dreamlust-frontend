/**
 * Admin WebSocket Client
 * Connects to WebSocket server for real-time admin updates
 */

import { io, Socket } from 'socket.io-client';
import { authStorage } from '../storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export interface AdminSocketEvents {
  'admin:new_upload': (data: { contentId: string; content: any; timestamp: string }) => void;
  'admin:moderation_result': (data: { contentId: string; result: any; timestamp: string }) => void;
  'admin:stats_update': (data: { stats: any; timestamp: string }) => void;
  'admin:new_report': (data: { report: any; timestamp: string }) => void;
}

/**
 * Connect to admin WebSocket
 */
export function connectAdminSocket(
  onConnect?: () => void,
  onDisconnect?: () => void,
  onError?: (error: Error) => void
): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = authStorage.getAccessToken();

  socket = io(API_BASE_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Admin WebSocket connected');
    
    // Join admin room
    socket?.emit('join-admin');
    
    socket?.on('joined-admin', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('✅ Joined admin room');
        onConnect?.();
      } else {
        console.error('❌ Failed to join admin room:', data.error);
        onError?.(new Error(data.error || 'Failed to join admin room'));
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Admin WebSocket disconnected');
    onDisconnect?.();
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Admin WebSocket connection error:', error);
    onError?.(error);
  });

  return socket;
}

/**
 * Disconnect admin WebSocket
 */
export function disconnectAdminSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to admin events
 */
export function subscribeToAdminEvents(handlers: Partial<AdminSocketEvents>): () => void {
  if (!socket) {
    connectAdminSocket();
  }

  if (!socket) {
    return () => {};
  }

  // Subscribe to events
  if (handlers['admin:new_upload']) {
    socket.on('admin:new_upload', handlers['admin:new_upload']);
  }
  if (handlers['admin:moderation_result']) {
    socket.on('admin:moderation_result', handlers['admin:moderation_result']);
  }
  if (handlers['admin:stats_update']) {
    socket.on('admin:stats_update', handlers['admin:stats_update']);
  }
  if (handlers['admin:new_report']) {
    socket.on('admin:new_report', handlers['admin:new_report']);
  }

  // Return unsubscribe function
  return () => {
    if (socket) {
      if (handlers['admin:new_upload']) {
        socket.off('admin:new_upload', handlers['admin:new_upload']);
      }
      if (handlers['admin:moderation_result']) {
        socket.off('admin:moderation_result', handlers['admin:moderation_result']);
      }
      if (handlers['admin:stats_update']) {
        socket.off('admin:stats_update', handlers['admin:stats_update']);
      }
      if (handlers['admin:new_report']) {
        socket.off('admin:new_report', handlers['admin:new_report']);
      }
    }
  };
}

/**
 * Get current socket instance
 */
export function getAdminSocket(): Socket | null {
  return socket;
}

