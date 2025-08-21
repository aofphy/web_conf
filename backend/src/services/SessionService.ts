import { createClient, RedisClientType } from 'redis';
import { JWTPayload } from '../utils/auth.js';
import { auditService } from './AuditService.js';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  participantType: string;
  loginTime: string;
  lastActivity: string;
  ip: string;
  userAgent?: string;
  refreshCount: number;
}

export class SessionService {
  private redis: RedisClientType;
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly BLACKLIST_PREFIX = 'blacklist:';
  private static readonly MAX_SESSIONS_PER_USER = 5;
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60; // 24 hours in seconds
  private static readonly MAX_REFRESH_COUNT = 10;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  // Create a new session
  public async createSession(
    sessionId: string, 
    payload: JWTPayload, 
    ip: string, 
    userAgent?: string
  ): Promise<void> {
    try {
      const sessionData: SessionData = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        participantType: payload.participantType,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ip,
        userAgent,
        refreshCount: 0,
      };

      const sessionKey = `${SessionService.SESSION_PREFIX}${sessionId}`;
      
      // Store session data
      await this.redis.setEx(
        sessionKey, 
        SessionService.SESSION_TIMEOUT, 
        JSON.stringify(sessionData)
      );

      // Manage user session limit
      await this.enforceSessionLimit(payload.userId, sessionId);

      // Log session creation
      await auditService.logLogin(payload.userId, payload.email, ip, userAgent, sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Session creation failed');
    }
  }

  // Get session data
  public async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `${SessionService.SESSION_PREFIX}${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Update session activity
  public async updateActivity(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (sessionData) {
        sessionData.lastActivity = new Date().toISOString();
        
        const sessionKey = `${SessionService.SESSION_PREFIX}${sessionId}`;
        await this.redis.setEx(
          sessionKey, 
          SessionService.SESSION_TIMEOUT, 
          JSON.stringify(sessionData)
        );
      }
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  // Refresh session (for token refresh)
  public async refreshSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData) {
        return false;
      }

      // Check refresh count limit
      if (sessionData.refreshCount >= SessionService.MAX_REFRESH_COUNT) {
        await this.destroySession(sessionId);
        
        await auditService.logSecurityViolation(
          'Excessive token refresh attempts',
          sessionData.ip,
          { 
            userId: sessionData.userId,
            email: sessionData.email,
            refreshCount: sessionData.refreshCount,
            sessionId
          },
          sessionData.userAgent,
          sessionId
        );
        
        return false;
      }

      // Update refresh count and activity
      sessionData.refreshCount++;
      sessionData.lastActivity = new Date().toISOString();
      
      const sessionKey = `${SessionService.SESSION_PREFIX}${sessionId}`;
      await this.redis.setEx(
        sessionKey, 
        SessionService.SESSION_TIMEOUT, 
        JSON.stringify(sessionData)
      );

      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  }

  // Destroy a session
  public async destroySession(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (sessionData) {
        await auditService.logLogout(
          sessionData.userId, 
          sessionData.email, 
          sessionData.ip, 
          sessionId
        );
      }

      const sessionKey = `${SessionService.SESSION_PREFIX}${sessionId}`;
      await this.redis.del(sessionKey);
    } catch (error) {
      console.error('Failed to destroy session:', error);
    }
  }

  // Destroy all sessions for a user
  public async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await this.redis.sMembers(userSessionsKey);
      
      for (const sessionId of sessionIds) {
        await this.destroySession(sessionId);
      }
      
      await this.redis.del(userSessionsKey);
    } catch (error) {
      console.error('Failed to destroy user sessions:', error);
    }
  }

  // Blacklist a token
  public async blacklistToken(tokenId: string, expiresAt: number): Promise<void> {
    try {
      const blacklistKey = `${SessionService.BLACKLIST_PREFIX}${tokenId}`;
      const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      
      if (ttl > 0) {
        await this.redis.setEx(blacklistKey, ttl, 'blacklisted');
      }
    } catch (error) {
      console.error('Failed to blacklist token:', error);
    }
  }

  // Check if token is blacklisted
  public async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const blacklistKey = `${SessionService.BLACKLIST_PREFIX}${tokenId}`;
      const result = await this.redis.get(blacklistKey);
      return result === 'blacklisted';
    } catch (error) {
      console.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  // Enforce session limit per user
  private async enforceSessionLimit(userId: string, newSessionId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      
      // Add new session to user's session set
      await this.redis.sAdd(userSessionsKey, newSessionId);
      
      // Get all sessions for user
      const sessionIds = await this.redis.sMembers(userSessionsKey);
      
      if (sessionIds.length > SessionService.MAX_SESSIONS_PER_USER) {
        // Get session data for all sessions to find oldest
        const sessionsWithData = await Promise.all(
          sessionIds.map(async (id) => ({
            id,
            data: await this.getSession(id)
          }))
        );
        
        // Filter out invalid sessions and sort by login time
        const validSessions = sessionsWithData
          .filter(s => s.data !== null)
          .sort((a, b) => 
            new Date(a.data!.loginTime).getTime() - new Date(b.data!.loginTime).getTime()
          );
        
        // Remove oldest sessions
        const sessionsToRemove = validSessions.slice(0, validSessions.length - SessionService.MAX_SESSIONS_PER_USER);
        
        for (const session of sessionsToRemove) {
          await this.destroySession(session.id);
          await this.redis.sRem(userSessionsKey, session.id);
        }
        
        // Log session limit enforcement
        if (sessionsToRemove.length > 0) {
          await auditService.logEvent({
            userId,
            userEmail: sessionsToRemove[0].data?.email || 'unknown',
            action: 'session_limit_enforced',
            resource: 'user_session',
            ip: 'system',
            severity: 'medium',
            category: 'security',
            details: {
              removedSessions: sessionsToRemove.length,
              maxSessions: SessionService.MAX_SESSIONS_PER_USER
            }
          });
        }
      }
      
      // Set expiration for user sessions set
      await this.redis.expire(userSessionsKey, SessionService.SESSION_TIMEOUT);
    } catch (error) {
      console.error('Failed to enforce session limit:', error);
    }
  }

  // Get active sessions for a user
  public async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await this.redis.sMembers(userSessionsKey);
      
      const sessions = await Promise.all(
        sessionIds.map(async (id) => {
          const data = await this.getSession(id);
          return data ? { ...data, sessionId: id } : null;
        })
      );
      
      return sessions.filter((session): session is SessionData => session !== null);
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  // Clean up expired sessions
  public async cleanupExpiredSessions(): Promise<void> {
    try {
      // This would typically be handled by Redis TTL, but we can add additional cleanup logic here
      console.log('Session cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  // Get session statistics
  public async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    sessionsByRole: Record<string, number>;
    averageSessionDuration: number;
  }> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd scan through all session keys
      const stats = {
        totalActiveSessions: 0,
        sessionsByRole: {} as Record<string, number>,
        averageSessionDuration: 0,
      };
      
      // Implementation would scan Redis keys and aggregate data
      // For now, return empty stats
      return stats;
    } catch (error) {
      console.error('Failed to get session statistics:', error);
      return {
        totalActiveSessions: 0,
        sessionsByRole: {},
        averageSessionDuration: 0,
      };
    }
  }

  // Close Redis connection
  public async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Failed to close Redis connection:', error);
    }
  }
}

// Singleton instance
export const sessionService = new SessionService();