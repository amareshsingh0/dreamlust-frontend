/**
 * WebSocket Broadcast Service for Admin Dashboard
 * Broadcasts real-time updates to connected admin clients
 */

import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

/**
 * Initialize WebSocket server instance
 */
export function initializeAdminBroadcast(io: SocketIOServer): void {
  ioInstance = io;
  console.log('✅ Admin broadcast service initialized');
}

/**
 * Broadcast event to all admin clients
 */
export function broadcastToAdmins(event: string, data: any): void {
  if (!ioInstance) {
    console.warn('⚠️ WebSocket server not initialized, skipping broadcast');
    return;
  }

  // Emit to all clients in 'admin' room
  ioInstance.to('admin').emit(event, data);
}

/**
 * Broadcast new upload event
 */
export function broadcastNewUpload(contentId: string, content: any): void {
  broadcastToAdmins('admin:new_upload', {
    contentId,
    content,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast moderation result
 */
export function broadcastModerationResult(
  contentId: string,
  result: {
    status: string;
    action: string;
    riskScore?: number;
  }
): void {
  broadcastToAdmins('admin:moderation_result', {
    contentId,
    result,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast stats update
 */
export function broadcastStatsUpdate(stats: any): void {
  broadcastToAdmins('admin:stats_update', {
    stats,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast new report
 */
export function broadcastNewReport(report: any): void {
  broadcastToAdmins('admin:new_report', {
    report,
    timestamp: new Date().toISOString(),
  });
}

