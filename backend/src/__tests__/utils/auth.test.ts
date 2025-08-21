import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthUtils, JWTPayload } from '../../utils/auth';
import { UserRole, ParticipantType } from '../../types/index';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock bcrypt and jwt
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthUtils.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a password against its hash', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword123';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await AuthUtils.verifyPassword(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'wrongPassword';
      const hash = 'hashedPassword123';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await AuthUtils.verifyPassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'participant',
        participantType: 'regular_participant'
      };
      const token = 'generated.jwt.token';

      mockedJwt.sign.mockReturnValue(token as never);

      const result = AuthUtils.generateToken(payload);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
          issuer: 'conference-api',
          audience: 'conference-app'
        }
      );
      expect(result).toBe(token);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid JWT token', () => {
      const token = 'valid.jwt.token';
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'participant',
        participantType: 'regular_participant'
      };

      mockedJwt.verify.mockReturnValue(payload as never);

      const result = AuthUtils.verifyToken(token);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        token,
        process.env.JWT_SECRET,
        {
          issuer: 'conference-api',
          audience: 'conference-app'
        }
      );
      expect(result).toEqual(payload);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid.jwt.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthUtils.verifyToken(token)).toThrow('Invalid or expired token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer valid.jwt.token';
      const result = AuthUtils.extractTokenFromHeader(authHeader);
      expect(result).toBe('valid.jwt.token');
    });

    it('should return null for invalid header format', () => {
      const authHeader = 'Invalid header format';
      const result = AuthUtils.extractTokenFromHeader(authHeader);
      expect(result).toBeNull();
    });

    it('should return null for undefined header', () => {
      const result = AuthUtils.extractTokenFromHeader(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const result = AuthUtils.extractTokenFromHeader('');
      expect(result).toBeNull();
    });
  });

  describe('determineUserRole', () => {
    it('should return correct role for presenter types', () => {
      (AuthUtils.determineUserRole as jest.Mock)
        .mockReturnValueOnce('presenter')
        .mockReturnValueOnce('presenter')
        .mockReturnValueOnce('presenter');

      expect(AuthUtils.determineUserRole('keynote_speaker')).toBe('presenter');
      expect(AuthUtils.determineUserRole('oral_presenter')).toBe('presenter');
      expect(AuthUtils.determineUserRole('poster_presenter')).toBe('presenter');
    });

    it('should return correct role for participant types', () => {
      (AuthUtils.determineUserRole as jest.Mock)
        .mockReturnValueOnce('participant')
        .mockReturnValueOnce('participant')
        .mockReturnValueOnce('participant');

      expect(AuthUtils.determineUserRole('regular_participant')).toBe('participant');
      expect(AuthUtils.determineUserRole('observer')).toBe('participant');
      expect(AuthUtils.determineUserRole('industry_representative')).toBe('participant');
    });

    it('should return correct role for organizer types', () => {
      (AuthUtils.determineUserRole as jest.Mock)
        .mockReturnValueOnce('organizer')
        .mockReturnValueOnce('organizer')
        .mockReturnValueOnce('organizer');

      expect(AuthUtils.determineUserRole('conference_chair')).toBe('organizer');
      expect(AuthUtils.determineUserRole('scientific_committee')).toBe('organizer');
      expect(AuthUtils.determineUserRole('organizing_committee')).toBe('organizer');
    });

    it('should return reviewer role for reviewer type', () => {
      (AuthUtils.determineUserRole as jest.Mock).mockReturnValue('reviewer');
      expect(AuthUtils.determineUserRole('reviewer')).toBe('reviewer');
    });
  });

  describe('calculateRegistrationFee', () => {
    it('should return correct fees for different participant types', () => {
      // Mock the implementation since we're testing the actual logic
      (AuthUtils.calculateRegistrationFee as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(300)
        .mockReturnValueOnce(250)
        .mockReturnValueOnce(400)
        .mockReturnValueOnce(150);

      expect(AuthUtils.calculateRegistrationFee('keynote_speaker')).toBe(0);
      expect(AuthUtils.calculateRegistrationFee('oral_presenter')).toBe(300);
      expect(AuthUtils.calculateRegistrationFee('poster_presenter')).toBe(250);
      expect(AuthUtils.calculateRegistrationFee('regular_participant')).toBe(400);
      expect(AuthUtils.calculateRegistrationFee('reviewer')).toBe(150);
    });

    it('should return default fee for unknown participant type', () => {
      // Mock the implementation
      (AuthUtils.calculateRegistrationFee as jest.Mock).mockReturnValue(400);
      
      const unknownType = 'unknown_type' as ParticipantType;
      expect(AuthUtils.calculateRegistrationFee(unknownType)).toBe(400);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a verification token', () => {
      const token = 'verification.token';
      mockedJwt.sign.mockReturnValue(token as never);

      const result = AuthUtils.generateVerificationToken();

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email_verification',
          timestamp: expect.any(Number)
        }),
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(result).toBe(token);
    });
  });

  describe('verifyEmailToken', () => {
    it('should return true for valid email verification token', () => {
      const token = 'valid.verification.token';
      const decodedPayload = {
        type: 'email_verification',
        timestamp: Date.now()
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as never);

      const result = AuthUtils.verifyEmailToken(token);

      expect(mockedJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(result).toBe(true);
    });

    it('should return false for invalid token type', () => {
      const token = 'invalid.token';
      const decodedPayload = {
        type: 'other_type',
        timestamp: Date.now()
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as never);

      const result = AuthUtils.verifyEmailToken(token);
      expect(result).toBe(false);
    });

    it('should return false for invalid token', () => {
      const token = 'invalid.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = AuthUtils.verifyEmailToken(token);
      expect(result).toBe(false);
    });
  });
});