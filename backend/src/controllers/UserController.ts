import { Request, Response } from 'express';
import { UserRepository } from '../models/UserRepository.js';
import { userValidation } from '../models/validation.js';
import { 
  UpdateUserRequest,
  SessionType,
  ParticipantType 
} from '../types/index.js';

export class UserController {
  /**
   * Update user profile
   * PUT /api/users/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
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

      // Validate request body
      const { error, value } = userValidation.updateUser.validate(req.body);
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

      const updateData: UpdateUserRequest = value;

      // Check if user exists
      const existingUser = await UserRepository.findById(userId);
      if (!existingUser) {
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

      // Update user
      const updatedUser = await UserRepository.update(userId, updateData);
      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user profile'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get updated user with sessions
      const userResponse = await UserRepository.findByIdWithSessions(userId);

      res.json({
        success: true,
        data: { user: userResponse },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PROFILE_FAILED',
          message: 'Failed to update user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user profile by ID (for admins/organizers)
   * GET /api/users/:userId
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUser = req.user;

      if (!requestingUser) {
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

      // Check if user can access this profile
      const canAccess = requestingUser.userId === userId || 
                       ['admin', 'organizer'].includes(requestingUser.role);

      if (!canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
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
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USER_FAILED',
          message: 'Failed to fetch user'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user sessions
   * PUT /api/users/sessions
   */
  static async updateSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { selectedSessions } = req.body;

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

      // Validate sessions
      if (!Array.isArray(selectedSessions)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SESSIONS',
            message: 'Selected sessions must be an array'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const validSessions: SessionType[] = ['CHE', 'CSE', 'BIO', 'MST', 'PFD'];
      const invalidSessions = selectedSessions.filter((session: string) => 
        !validSessions.includes(session as SessionType)
      );

      if (invalidSessions.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SESSION_TYPES',
            message: `Invalid session types: ${invalidSessions.join(', ')}`
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (selectedSessions.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_SESSIONS_SELECTED',
            message: 'At least one session must be selected'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update user sessions
      const updatedUser = await UserRepository.update(userId, { selectedSessions });
      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user sessions'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get updated user with sessions
      const userResponse = await UserRepository.findByIdWithSessions(userId);

      res.json({
        success: true,
        data: { 
          user: userResponse,
          message: 'Sessions updated successfully'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update sessions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SESSIONS_FAILED',
          message: 'Failed to update user sessions'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update presenter bio and expertise
   * PUT /api/users/presenter-info
   */
  static async updatePresenterInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const participantType = req.user?.participantType;
      const { bio, expertise } = req.body;

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

      // Check if user is a presenter type
      const presenterTypes: ParticipantType[] = [
        'keynote_speaker',
        'oral_presenter',
        'poster_presenter',
        'panelist',
        'workshop_leader'
      ];

      if (!participantType || (!presenterTypes.includes(participantType) && userRole !== 'presenter')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'NOT_PRESENTER',
            message: 'Only presenters can update bio and expertise information'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate bio and expertise
      if (bio !== undefined && typeof bio !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BIO',
            message: 'Bio must be a string'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (expertise !== undefined && (!Array.isArray(expertise) || 
          !expertise.every((item: any) => typeof item === 'string'))) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EXPERTISE',
            message: 'Expertise must be an array of strings'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate bio length
      if (bio && bio.length > 2000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BIO_TOO_LONG',
            message: 'Bio must be less than 2000 characters'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate expertise items
      if (expertise && expertise.some((item: string) => item.length > 100)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EXPERTISE_ITEM_TOO_LONG',
            message: 'Each expertise item must be less than 100 characters'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update user presenter info
      const updateData: UpdateUserRequest = {};
      if (bio !== undefined) updateData.bio = bio;
      if (expertise !== undefined) updateData.expertise = expertise;

      const updatedUser = await UserRepository.update(userId, updateData);
      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update presenter information'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get updated user with sessions
      const userResponse = await UserRepository.findByIdWithSessions(userId);

      res.json({
        success: true,
        data: { 
          user: userResponse,
          message: 'Presenter information updated successfully'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update presenter info error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PRESENTER_INFO_FAILED',
          message: 'Failed to update presenter information'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available session types with descriptions
   * GET /api/users/session-types
   */
  static async getSessionTypes(_req: Request, res: Response): Promise<void> {
    try {
      const sessionTypes = [
        {
          value: 'CHE' as SessionType,
          label: 'Computational Chemistry',
          description: 'Research in computational methods for chemistry, molecular modeling, and chemical simulations'
        },
        {
          value: 'CSE' as SessionType,
          label: 'High Performance Computing/Computer Science/Engineering',
          description: 'High-performance computing, computer science research, and computational engineering'
        },
        {
          value: 'BIO' as SessionType,
          label: 'Computational Biology/Bioinformatics/Biochemistry/Biophysics',
          description: 'Computational biology, bioinformatics, biochemistry, and biophysics research'
        },
        {
          value: 'MST' as SessionType,
          label: 'Mathematics and Statistics',
          description: 'Mathematical modeling, statistical analysis, and computational mathematics'
        },
        {
          value: 'PFD' as SessionType,
          label: 'Computational Physics/Computational Fluid Dynamics/Solid Mechanics',
          description: 'Computational physics, fluid dynamics simulations, and solid mechanics modeling'
        }
      ];

      res.json({
        success: true,
        data: { sessionTypes },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get session types error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SESSION_TYPES_FAILED',
          message: 'Failed to fetch session types'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user preferences and settings
   * GET /api/users/preferences
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
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

      const user = await UserRepository.findByIdWithSessions(userId);
      
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

      const preferences = {
        selectedSessions: user.selectedSessions,
        participantType: user.participantType,
        role: user.role,
        bio: user.bio,
        expertise: user.expertise,
        paymentStatus: user.paymentStatus,
        registrationFee: user.registrationFee
      };

      res.json({
        success: true,
        data: { preferences },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PREFERENCES_FAILED',
          message: 'Failed to fetch user preferences'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}