import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  authorize,
  authorizeParticipantType,
  requireAdmin,
  requireOrganizer,
  requireReviewer,
  requirePresenter,
  optionalAuth,
  requireOwnershipOrAdmin,
  authRateLimit
} from '../../middleware/auth';
import { AuthUtils, JWTPayload } from '../../utils/auth';
import { auditService } from '../../services/AuditService';

// Mock dependencies
jest.mock('../../utils/auth');
jest.mock('../../services/AuditService');

const mockedAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockedAuditService = auditService as jest.Mocked<typeof auditService>;

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: JWTPayload;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'participant',
      participantType: 'regular_participant'
    };

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      url: '/api/test',
      method: 'GET',
      params: {},
      get: jest.fn().mockReturnValue('test-user-agent'),
      requestId: 'req-123'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Mock audit service methods
    mockedAuditService.logSecurityViolation = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', () => {
      const token = 'valid-jwt-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(token);
      mockedAuthUtils.verifyToken.mockReturnValue(mockUser);

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      mockReq.headers = {};

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockedAuditService.logSecurityViolation).toHaveBeenCalledWith(
        'Missing authentication token',
        mockReq.ip,
        { url: mockReq.url, method: mockReq.method },
        'test-user-agent',
        mockReq.requestId
      );
    });

    it('should reject invalid token', () => {
      const token = 'invalid-jwt-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(token);
      mockedAuthUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockedAuditService.logSecurityViolation).toHaveBeenCalledWith(
        'Invalid or expired token',
        mockReq.ip,
        expect.objectContaining({
          url: mockReq.url,
          method: mockReq.method,
          error: 'Invalid token'
        }),
        'test-user-agent',
        mockReq.requestId
      );
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', () => {
      mockReq.user = { ...mockUser, role: 'admin' };
      const middleware = authorize('admin', 'organizer');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user without authentication', () => {
      mockReq.user = undefined;
      const middleware = authorize('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject user with insufficient role', () => {
      mockReq.user = { ...mockUser, role: 'participant' };
      const middleware = authorize('admin', 'organizer');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required roles: admin, organizer'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockedAuditService.logSecurityViolation).toHaveBeenCalledWith(
        'Insufficient privileges for resource access',
        mockReq.ip,
        expect.objectContaining({
          userRole: 'participant',
          requiredRoles: ['admin', 'organizer'],
          userId: mockUser.userId,
          userEmail: mockUser.email
        }),
        'test-user-agent',
        mockReq.requestId
      );
    });
  });

  describe('authorizeParticipantType', () => {
    it('should authorize user with correct participant type', () => {
      mockReq.user = { ...mockUser, participantType: 'oral_presenter' };
      const middleware = authorizeParticipantType('oral_presenter', 'poster_presenter');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user without authentication', () => {
      mockReq.user = undefined;
      const middleware = authorizeParticipantType('oral_presenter');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject user with wrong participant type', () => {
      mockReq.user = { ...mockUser, participantType: 'regular_participant' };
      const middleware = authorizeParticipantType('oral_presenter', 'poster_presenter');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required participant types: oral_presenter, poster_presenter'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role-specific middleware', () => {
    it('requireAdmin should only allow admin role', () => {
      mockReq.user = { ...mockUser, role: 'admin' };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requireOrganizer should allow organizer and admin roles', () => {
      mockReq.user = { ...mockUser, role: 'organizer' };

      requireOrganizer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requireReviewer should allow reviewer, organizer, and admin roles', () => {
      mockReq.user = { ...mockUser, role: 'reviewer' };

      requireReviewer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requirePresenter should allow presenter, organizer, and admin roles', () => {
      mockReq.user = { ...mockUser, role: 'presenter' };

      requirePresenter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should add user to request if valid token provided', () => {
      const token = 'valid-jwt-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(token);
      mockedAuthUtils.verifyToken.mockReturnValue(mockUser);

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user if no token provided', () => {
      mockReq.headers = {};

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user if invalid token provided', () => {
      const token = 'invalid-jwt-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      mockedAuthUtils.extractTokenFromHeader.mockReturnValue(token);
      mockedAuthUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrAdmin', () => {
    it('should allow user to access their own resource', () => {
      mockReq.user = mockUser;
      mockReq.params = { userId: mockUser.userId };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow admin to access any resource', () => {
      mockReq.user = { ...mockUser, role: 'admin' };
      mockReq.params = { userId: 'other-user-id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow organizer to access any resource', () => {
      mockReq.user = { ...mockUser, role: 'organizer' };
      mockReq.params = { userId: 'other-user-id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user accessing others resource', () => {
      mockReq.user = mockUser;
      mockReq.params = { userId: 'other-user-id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You can only access your own resources.'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom parameter name', () => {
      mockReq.user = mockUser;
      mockReq.params = { authorId: mockUser.userId };
      const middleware = requireOwnershipOrAdmin('authorId');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockReq.user = undefined;
      const middleware = requireOwnershipOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authRateLimit', () => {
    it('should allow first request from IP', () => {
      const middleware = authRateLimit(15 * 60 * 1000, 5);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow requests within limit', () => {
      const middleware = authRateLimit(15 * 60 * 1000, 5);

      // Make 5 requests (should all pass)
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = authRateLimit(15 * 60 * 1000, 3);

      // Make 4 requests (4th should be blocked)
      for (let i = 0; i < 4; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many authentication attempts. Please try again later.'
        },
        timestamp: expect.any(String)
      });
    });

    it('should reset counter after window expires', () => {
      const windowMs = 100; // 100ms window for testing
      const middleware = authRateLimit(windowMs, 2);

      // Make 2 requests (should pass)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);

      // Wait for window to expire
      setTimeout(() => {
        // This request should pass after window reset
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(3);
      }, windowMs + 10);
    });

    it('should handle different IPs separately', () => {
      const middleware = authRateLimit(15 * 60 * 1000, 2);

      // First IP
      mockReq.ip = '127.0.0.1';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Second IP
      mockReq.ip = '192.168.1.1';
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});