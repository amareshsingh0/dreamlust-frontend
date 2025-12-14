// Session store with Redis caching support
// Uses in-memory store as primary, Redis as cache layer
import { cacheSession, invalidateSession } from '../cache/sessionCache';

interface Session {
  userId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  /**
   * Create a new session
   */
  async create(sessionId: string, session: Session): Promise<void> {
    this.sessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(session.userId)) {
      this.userSessions.set(session.userId, new Set());
    }
    this.userSessions.get(session.userId)!.add(sessionId);
    
    // Also cache in Redis
    await cacheSession(sessionId, session);
  }

  /**
   * Get session by ID
   */
  get(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    
    // Check if expired
    if (session && session.expiresAt < new Date()) {
      // Fire and forget async deletion
      this.delete(sessionId).catch(err => console.error('Error deleting expired session:', err));
      return undefined;
    }
    
    return session;
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      const userSessions = this.userSessions.get(session.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
      
      // Also invalidate in Redis
      await invalidateSession(sessionId);
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllForUser(userId: string): Promise<void> {
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      const sessionIds = Array.from(userSessions);
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
        await invalidateSession(sessionId);
      }
      this.userSessions.delete(userId);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }
    
    // Delete all expired sessions
    await Promise.all(expiredSessions.map(sessionId => this.delete(sessionId)));
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((session): session is Session => session !== undefined && session.expiresAt >= new Date());
  }
}

// Singleton instance
export const sessionStore = new SessionStore();

// Cleanup expired sessions every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionStore.cleanup().catch(err => console.error('Error during session cleanup:', err));
  }, 60 * 60 * 1000); // 1 hour
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

