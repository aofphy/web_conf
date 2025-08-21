import { Request, Response } from 'express';
import { UserRepository } from '../models/UserRepository.js';
import { EmailService } from '../services/EmailService.js';
import { AuthUtils } from '../utils/auth.js';
import { userValidation } from '../models/validation.js';
import { 
  CreateUserRequest, 
  LoginRequest, 
  LoginResponse,
  ParticipantType 
} from '../types/index.js';

export class AuthController {
  private static emailService = new EmailService();

  /**
   * Register a new user with participant type selection
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.createUser.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            details: error.details
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userData: CreateUserRequest = value;

      // Check if user already exists
      const existingUser = await UserRepository.findByEmail(userData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'A user with this email already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Hash password
      const passwordHash = await AuthUtils.hashPassword(userData.password);

      // Create user
      const user = await UserRepository.create({
        ...userData,
        passwordHash
      });

      // Update user role and registration fee
      await UserRepository.update(user.id, {});
      const updatedUser = await UserRepository.findById(user.id);
      
      if (!updatedUser) {
        throw new Error('Failed to create user');
      }

      // Generate verification token
      const verificationToken = AuthUtils.generateVerificationToken();

      // Send verification email
      try {
        await this.emailService.sendVerificationEmail(updatedUser, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }

      // Get user with sessions for response
      const userResponse = await UserRepository.findByIdWithSessions(updatedUser.id);

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          message: 'Registration successful. Please check your email to verify your account.',
          verificationRequired: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Verify email address
   * POST /api/auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token, email } = req.body;

      if (!token || !email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Token and email are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify token
      if (!AuthUtils.verifyEmailToken(token)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find user
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update user as verified (activate account)
      await UserRepository.update(user.id, {});

      // Send registration confirmation and welcome emails
      try {
        await this.emailService.sendRegistrationConfirmation(user);
        await this.emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error('Failed to send confirmation emails:', emailError);
      }

      res.json({
        success: true,
        data: {
          message: 'Email verified successfully. Your account is now active.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify email'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * User login
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.login.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { email, password }: LoginRequest = value;

      // Find user
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify password
      const isValidPassword = await AuthUtils.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is not active. Please verify your email address.'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        participantType: user.participantType
      });

      // Get user with sessions for response
      const userResponse = await UserRepository.findByIdWithSessions(user.id);

      const loginResponse: LoginResponse = {
        user: userResponse!,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      };

      res.json({
        success: true,
        data: loginResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Failed to login'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userResponse = await UserRepository.findByIdWithSessions(userId);
      
      if (!userResponse) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: { user: userResponse },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available participant types
   * GET /api/auth/participant-types
   */
  static async getParticipantTypes(_req: Request, res: Response): Promise<void> {
    try {
      const participantTypes: Array<{
        value: ParticipantType;
        label: string;
        category: string;
        description: string;
        fee: number;
      }> = [
        // Presenters/Speakers
        {
          value: 'keynote_speaker',
          label: 'Keynote Speaker',
          category: 'Presenters/Speakers',
          description: 'Invited keynote speaker for the conference',
          fee: AuthUtils.calculateRegistrationFee('keynote_speaker')
        },
        {
          value: 'oral_presenter',
          label: 'Oral Presenter',
          category: 'Presenters/Speakers',
          description: 'Presenter giving an oral presentation',
          fee: AuthUtils.calculateRegistrationFee('oral_presenter')
        },
        {
          value: 'poster_presenter',
          label: 'Poster Presenter',
          category: 'Presenters/Speakers',
          description: 'Presenter displaying a poster',
          fee: AuthUtils.calculateRegistrationFee('poster_presenter')
        },
        {
          value: 'panelist',
          label: 'Panelist',
          category: 'Presenters/Speakers',
          description: 'Panel discussion participant',
          fee: AuthUtils.calculateRegistrationFee('panelist')
        },
        {
          value: 'workshop_leader',
          label: 'Workshop Leader',
          category: 'Presenters/Speakers',
          description: 'Leading a workshop session',
          fee: AuthUtils.calculateRegistrationFee('workshop_leader')
        },
        
        // Attendees
        {
          value: 'regular_participant',
          label: 'Regular Participant',
          category: 'Attendees',
          description: 'General conference attendee',
          fee: AuthUtils.calculateRegistrationFee('regular_participant')
        },
        {
          value: 'observer',
          label: 'Observer',
          category: 'Attendees',
          description: 'Observing conference sessions',
          fee: AuthUtils.calculateRegistrationFee('observer')
        },
        {
          value: 'industry_representative',
          label: 'Industry Representative',
          category: 'Attendees',
          description: 'Representative from industry/company',
          fee: AuthUtils.calculateRegistrationFee('industry_representative')
        },
        
        // Organizers
        {
          value: 'conference_chair',
          label: 'Conference Chair',
          category: 'Organizers',
          description: 'Conference organizing committee chair',
          fee: AuthUtils.calculateRegistrationFee('conference_chair')
        },
        {
          value: 'scientific_committee',
          label: 'Scientific Committee',
          category: 'Organizers',
          description: 'Scientific committee member',
          fee: AuthUtils.calculateRegistrationFee('scientific_committee')
        },
        {
          value: 'organizing_committee',
          label: 'Organizing Committee',
          category: 'Organizers',
          description: 'Conference organizing committee member',
          fee: AuthUtils.calculateRegistrationFee('organizing_committee')
        },
        {
          value: 'session_chair',
          label: 'Session Chair',
          category: 'Organizers',
          description: 'Chairing a conference session',
          fee: AuthUtils.calculateRegistrationFee('session_chair')
        },
        
        // Support Roles
        {
          value: 'reviewer',
          label: 'Reviewer',
          category: 'Support Roles',
          description: 'Reviewing submitted abstracts/papers',
          fee: AuthUtils.calculateRegistrationFee('reviewer')
        },
        {
          value: 'technical_support',
          label: 'Technical Support',
          category: 'Support Roles',
          description: 'Providing technical support',
          fee: AuthUtils.calculateRegistrationFee('technical_support')
        },
        {
          value: 'volunteer',
          label: 'Volunteer',
          category: 'Support Roles',
          description: 'Conference volunteer',
          fee: AuthUtils.calculateRegistrationFee('volunteer')
        },
        
        // Special Guests
        {
          value: 'sponsor',
          label: 'Sponsor',
          category: 'Special Guests',
          description: 'Conference sponsor representative',
          fee: AuthUtils.calculateRegistrationFee('sponsor')
        },
        {
          value: 'government_representative',
          label: 'Government Representative',
          category: 'Special Guests',
          description: 'Government or institutional representative',
          fee: AuthUtils.calculateRegistrationFee('government_representative')
        }
      ];

      res.json({
        success: true,
        data: { participantTypes },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get participant types error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch participant types'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // This endpoint exists for consistency and future token blacklisting if needed
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await UserRepository.findByEmail(email);
      
      // Always return success to prevent email enumeration
      if (user) {
        const resetToken = AuthUtils.generateVerificationToken();
        
        try {
          await this.emailService.sendPasswordResetEmail(user, resetToken);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }

      res.json({
        success: true,
        data: {
          message: 'If an account with that email exists, a password reset link has been sent.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_REQUEST_FAILED',
          message: 'Failed to process password reset request'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, email, newPassword } = req.body;

      if (!token || !email || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Token, email, and new password are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate new password
      const { error } = userValidation.createUser.extract('password').validate(newPassword);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify token
      if (!AuthUtils.verifyEmailToken(token)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find user
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Hash new password
      const passwordHash = await AuthUtils.hashPassword(newPassword);

      // Update user password
      await UserRepository.updatePassword(user.id, passwordHash);

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully. You can now log in with your new password.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message: 'Failed to reset password'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Change password for authenticated user
   * POST /api/auth/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Current password and new password are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate new password
      const { error } = userValidation.createUser.extract('password').validate(newPassword);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find user
      const user = await UserRepository.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify current password
      const isValidPassword = await AuthUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Hash new password
      const passwordHash = await AuthUtils.hashPassword(newPassword);

      // Update user password
      await UserRepository.updatePassword(user.id, passwordHash);

      res.json({
        success: true,
        data: {
          message: 'Password changed successfully'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHANGE_PASSWORD_FAILED',
          message: 'Failed to change password'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find user to get current data
      const user = await UserRepository.findById(userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'User account is inactive'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate new token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        participantType: user.participantType
      });

      res.json({
        success: true,
        data: {
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh token'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}