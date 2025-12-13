// Simple in-memory session store (replace with Redis in production)
// For production, use Redis: import Redis from 'ioredis';

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
  create(sessionId: string, session: Session): void {
    this.sessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(session.userId)) {
      this.userSessions.set(session.userId, new Set());
    }
    this.userSessions.get(session.userId)!.add(sessionId);
  }

  /**
   * Get session by ID
   */
  get(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    
    // Check if expired
    if (session && session.expiresAt < new Date()) {
      this.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  /**
   * Delete session
   */
  delete(sessionId: string): void {
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
    }
  }

  /**
   * Delete all sessions for a user
   */
  deleteAllForUser(userId: string): void {
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.forEach((sessionId) => {
        this.sessions.delete(sessionId);
      });
      this.userSessions.delete(userId);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.delete(sessionId);
      }
    }
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
    sessionStore.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

