import { Request, Response, NextFunction } from 'express';
import { AuthUtils, JWTPayload } from '../utils/auth.js';
import { UserRole, ParticipantType } from '../types/index.js';
import { auditService } from '../services/AuditService.js';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      // Log failed authentication attempt
      auditService.logSecurityViolation(
        'Missing authentication token',
        req.ip,
        { url: req.url, method: req.method },
        req.get('User-Agent'),
        req.requestId
      );

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const payload = AuthUtils.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    // Log invalid token attempt
    auditService.logSecurityViolation(
      'Invalid or expired token',
      req.ip,
      { 
        url: req.url, 
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      req.get('User-Agent'),
      req.requestId
    );

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to authorize specific user roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      auditService.logSecurityViolation(
        'Authorization attempted without authentication',
        req.ip,
        { url: req.url, method: req.method, requiredRoles: allowedRoles },
        req.get('User-Agent'),
        req.requestId
      );

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // Log unauthorized access attempt
      auditService.logSecurityViolation(
        'Insufficient privileges for resource access',
        req.ip,
        { 
          url: req.url, 
          method: req.method,
          userRole: user.role,
          requiredRoles: allowedRoles,
          userId: user.userId,
          userEmail: user.email
        },
        req.get('User-Agent'),
        req.requestId
      );

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to authorize specific participant types
 */
export const authorizeParticipantType = (...allowedTypes: ParticipantType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedTypes.includes(user.participantType)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required participant types: ${allowedTypes.join(', ')}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for admin-only access
 */
export const requireAdmin = authorize('admin');

/**
 * Middleware for organizer and admin access
 */
export const requireOrganizer = authorize('organizer', 'admin');

/**
 * Middleware for reviewer, organizer, and admin access
 */
export const requireReviewer = authorize('reviewer', 'organizer', 'admin');

/**
 * Middleware for presenter access (includes presenters, organizers, and admins)
 */
export const requirePresenter = authorize('presenter', 'organizer', 'admin');

/**
 * Optional authentication - adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = AuthUtils.verifyToken(token);
      req.user = payload;
    }
  } catch (error) {
    // Ignore token errors for optional auth
    console.log('Optional auth failed:', error);
  }

  next();
};

/**
 * Middleware to check if user owns the resource or has admin/organizer privileges
 */
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    const resourceUserId = req.params[userIdParam];

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Allow if user owns the resource or has admin/organizer privileges
    if (user.userId === resourceUserId || ['admin', 'organizer'].includes(user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. You can only access your own resources.'
      },
      timestamp: new Date().toISOString()
    });
  };
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const userAttempts = attempts.get(ip);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userAttempts.count >= max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many authentication attempts. Please try again later.'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    userAttempts.count++;
    next();
  };
};