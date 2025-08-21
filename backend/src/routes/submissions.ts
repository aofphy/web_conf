import express from 'express';
import { SubmissionController } from '../controllers/SubmissionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validateRequest, 
  rateLimitConfigs, 
  securityMiddleware,
  validateContentType,
  limitRequestSize,
  validateFileUpload,
  commonValidationSchemas
} from '../middleware/validation.js';
import { submissionValidation, paginationValidation } from '../models/validation.js';
import Joi from 'joi';

const router = express.Router();
const submissionController = new SubmissionController();

// Validation schemas for submission endpoints
const submissionValidationSchemas = {
  create: submissionValidation.createSubmission,
  update: submissionValidation.updateSubmission,
  updateStatus: Joi.object({
    status: Joi.string().valid('submitted', 'under_review', 'accepted', 'rejected').required(),
    adminNotes: Joi.string().max(1000).optional(),
  }),
  sessionType: Joi.object({
    sessionType: Joi.string().valid('CHE', 'CSE', 'BIO', 'MST', 'PFD').required(),
  }),
};

// Apply security middleware to all routes
router.use(securityMiddleware());
router.use(limitRequestSize(10 * 1024 * 1024)); // 10MB limit for file uploads

// Protected routes - require authentication
router.use(authenticate);

// Create a new submission
router.post('/', 
  rateLimitConfigs.submission,
  validateContentType(['application/json']),
  validateRequest(submissionValidationSchemas.create),
  submissionController.createSubmission.bind(submissionController)
);

// Get user's submissions
router.get('/my-submissions', 
  validateRequest(paginationValidation, 'query'),
  submissionController.getUserSubmissions.bind(submissionController)
);

// Get specific submission by ID (user must own it or be admin/reviewer)
router.get('/:id', 
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.getSubmissionById.bind(submissionController)
);

// Update submission (user must own it and submission must be editable)
router.put('/:id', 
  rateLimitConfigs.submission,
  validateContentType(['application/json']),
  validateRequest(commonValidationSchemas.uuid, 'params'),
  validateRequest(submissionValidationSchemas.update),
  submissionController.updateSubmission.bind(submissionController)
);

// Delete submission (user must own it and submission must be deletable)
router.delete('/:id', 
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.deleteSubmission.bind(submissionController)
);

// Admin/Reviewer routes
router.get('/', 
  authorize('admin', 'reviewer'),
  validateRequest(paginationValidation, 'query'),
  submissionController.getAllSubmissions.bind(submissionController)
);

// Update submission status (admin only)
router.patch('/:id/status', 
  authorize('admin'),
  validateContentType(['application/json']),
  validateRequest(commonValidationSchemas.uuid, 'params'),
  validateRequest(submissionValidationSchemas.updateStatus),
  submissionController.updateSubmissionStatus.bind(submissionController)
);

// Get submissions by session type (admin/reviewer)
router.get('/session/:sessionType', 
  authorize('admin', 'reviewer'),
  validateRequest(submissionValidationSchemas.sessionType, 'params'),
  validateRequest(paginationValidation, 'query'),
  submissionController.getSubmissionsBySession.bind(submissionController)
);

// Get submission statistics (admin only)
router.get('/stats/overview', authorize('admin'), submissionController.getSubmissionStatistics.bind(submissionController));

// Manuscript management routes
router.post('/:submissionId/manuscript', 
  rateLimitConfigs.fileUpload,
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.getUploadMiddleware(), 
  validateFileUpload('manuscript'),
  submissionController.uploadManuscript.bind(submissionController)
);

router.get('/:submissionId/manuscript/info', 
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.getManuscriptInfo.bind(submissionController)
);

router.get('/:submissionId/manuscript/download', 
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.downloadManuscript.bind(submissionController)
);

router.delete('/:submissionId/manuscript', 
  validateRequest(commonValidationSchemas.uuid, 'params'),
  submissionController.deleteManuscript.bind(submissionController)
);

export default router;