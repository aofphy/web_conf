import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate, authRateLimit } from '../middleware/auth.js';
import { 
  validateRequest, 
  rateLimitConfigs, 
  securityMiddleware,
  validateContentType,
  limitRequestSize
} from '../middleware/validation.js';
import { userValidation } from '../models/validation.js';
import Joi from 'joi';

const router = Router();

// Validation schemas for auth endpoints
const authValidationSchemas = {
  register: userValidation.createUser,
  login: userValidation.login,
  verifyEmail: Joi.object({
    token: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    email: Joi.string().email().required(),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required(),
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required(),
  }),
};

// Apply security middleware to all routes
router.use(securityMiddleware());
router.use(limitRequestSize(1024 * 1024)); // 1MB limit for auth requests
router.use(validateContentType(['application/json']));

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with participant type selection
 * @access  Public
 * @body    { email, password, firstName, lastName, affiliation, country, participantType, selectedSessions, bio?, expertise? }
 */
router.post('/register', 
  rateLimitConfigs.auth,
  validateRequest(authValidationSchemas.register),
  AuthController.register
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email address
 * @access  Public
 * @body    { token, email }
 */
router.post('/verify-email', 
  rateLimitConfigs.auth,
  validateRequest(authValidationSchemas.verifyEmail),
  AuthController.verifyEmail
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', 
  rateLimitConfigs.auth,
  validateRequest(authValidationSchemas.login),
  AuthController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @route   GET /api/auth/participant-types
 * @desc    Get available participant types with fees and descriptions
 * @access  Public
 */
router.get('/participant-types', AuthController.getParticipantTypes);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', 
  rateLimitConfigs.auth,
  validateRequest(authValidationSchemas.forgotPassword),
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, email, newPassword }
 */
router.post('/reset-password', 
  rateLimitConfigs.auth,
  validateRequest(authValidationSchemas.resetPassword),
  AuthController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password', 
  authenticate,
  validateRequest(authValidationSchemas.changePassword),
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, AuthController.refreshToken);

export default router;