/**
 * Download Event Emitter
 * Emits Socket.io events for download progress
 */

import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

/**
 * Set Socket.io instance (called from server.ts)
 */
export function setSocketInstance(io: SocketIOServer) {
  ioInstance = io;
}

/**
 * Get Socket.io instance
 */
export function getSocketInstance(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Emit download progress event
 */
export function emitDownloadProgress(userId: string, downloadId: string, progress: number) {
  if (!ioInstance) return;
  
  ioInstance.to(`user:${userId}`).emit('download:progress', {
    downloadId,
    progress,
  });
}

/**
 * Emit download completed event
 */
export function emitDownloadCompleted(userId: string, downloadId: string) {
  if (!ioInstance) return;
  
  ioInstance.to(`user:${userId}`).emit('download:completed', {
    downloadId,
  });
}

/**
 * Emit download failed event
 */
export function emitDownloadFailed(userId: string, downloadId: string, error: string) {
  if (!ioInstance) return;
  
  ioInstance.to(`user:${userId}`).emit('download:failed', {
    downloadId,
    error,
  });
}

