import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { 
  authenticate, 
  requireOwnershipOrAdmin
} from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/users/session-types
 * @desc    Get available session types with descriptions
 * @access  Public
 */
router.get('/session-types', UserController.getSessionTypes);

/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences and settings
 * @access  Private
 */
router.get('/preferences', authenticate, UserController.getPreferences);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { firstName?, lastName?, affiliation?, country?, selectedSessions? }
 */
router.put('/profile', authenticate, UserController.updateProfile);

/**
 * @route   PUT /api/users/sessions
 * @desc    Update user session selections
 * @access  Private
 * @body    { selectedSessions: SessionType[] }
 */
router.put('/sessions', authenticate, UserController.updateSessions);

/**
 * @route   PUT /api/users/presenter-info
 * @desc    Update presenter bio and expertise (presenters only)
 * @access  Private (presenters only)
 * @body    { bio?, expertise?: string[] }
 */
router.put('/presenter-info', authenticate, UserController.updatePresenterInfo);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile by ID
 * @access  Private (own profile or admin/organizer)
 */
router.get('/:userId', authenticate, requireOwnershipOrAdmin('userId'), UserController.getUserById);

export default router;