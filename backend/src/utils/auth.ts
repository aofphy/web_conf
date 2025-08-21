import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole, ParticipantType } from '../types/index.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  participantType: ParticipantType;
}

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'conference-api',
      audience: 'conference-app'
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'conference-api',
        audience: 'conference-app'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Determine user role based on participant type
   */
  static determineUserRole(participantType: ParticipantType): UserRole {
    const roleMapping: Record<ParticipantType, UserRole> = {
      // Presenters/Speakers
      keynote_speaker: 'presenter',
      oral_presenter: 'presenter',
      poster_presenter: 'presenter',
      panelist: 'presenter',
      workshop_leader: 'presenter',
      
      // Attendees
      regular_participant: 'participant',
      observer: 'participant',
      industry_representative: 'participant',
      
      // Organizers
      conference_chair: 'organizer',
      scientific_committee: 'organizer',
      organizing_committee: 'organizer',
      session_chair: 'organizer',
      
      // Support Roles
      reviewer: 'reviewer',
      technical_support: 'participant',
      volunteer: 'participant',
      
      // Special Guests
      sponsor: 'participant',
      government_representative: 'participant'
    };

    return roleMapping[participantType] || 'participant';
  }

  /**
   * Calculate registration fee based on participant type
   */
  static calculateRegistrationFee(participantType: ParticipantType): number {
    const feeStructure: Record<ParticipantType, number> = {
      // Presenters/Speakers - Standard fees
      keynote_speaker: 0, // Keynote speakers typically don't pay
      oral_presenter: 300,
      poster_presenter: 250,
      panelist: 200,
      workshop_leader: 150,
      
      // Attendees - Standard fees
      regular_participant: 400,
      observer: 300,
      industry_representative: 500,
      
      // Organizers - Reduced or no fees
      conference_chair: 0,
      scientific_committee: 0,
      organizing_committee: 0,
      session_chair: 100,
      
      // Support Roles - Reduced fees
      reviewer: 150,
      technical_support: 0,
      volunteer: 0,
      
      // Special Guests - Variable fees
      sponsor: 0,
      government_representative: 200
    };

    return feeStructure[participantType] || 400;
  }

  /**
   * Generate a secure random verification token
   */
  static generateVerificationToken(): string {
    return jwt.sign(
      { type: 'email_verification', timestamp: Date.now() },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify an email verification token
   */
  static verifyEmailToken(token: string): boolean {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return decoded.type === 'email_verification';
    } catch {
      return false;
    }
  }
}