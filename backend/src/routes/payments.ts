import express from 'express';
import { PaymentController } from '../controllers/PaymentController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { FileService } from '../services/FileService.js';
import { 
  validateRequest, 
  rateLimitConfigs, 
  securityMiddleware,
  validateContentType,
  limitRequestSize,
  validateFileUpload,
  commonValidationSchemas
} from '../middleware/validation.js';
import { paymentValidation, paginationValidation } from '../models/validation.js';
import Joi from 'joi';

const router = express.Router();
const fileService = new FileService();

// Validation schemas for payment endpoints
const paymentValidationSchemas = {
  verifyPayment: paymentValidation.verifyPayment,
  rejectPayment: Joi.object({
    adminNotes: Joi.string().min(10).max(1000).required(),
  }),
};

// Apply security middleware to all routes
router.use(securityMiddleware());
router.use(limitRequestSize(5 * 1024 * 1024)); // 5MB limit for payment proof uploads

// User routes
// Get payment information and instructions for authenticated user
router.get('/info', authenticate, PaymentController.getPaymentInfo);

// Get payment status and history for authenticated user
router.get('/status', authenticate, PaymentController.getPaymentStatus);

// Submit proof of payment with file upload
router.post('/submit-proof', 
  authenticate,
  rateLimitConfigs.fileUpload,
  fileService.getPaymentProofMulterConfig().single('proofFile'),
  validateFileUpload('paymentProof'),
  PaymentController.submitProofOfPayment
);

// Download proof of payment file
router.get('/proof/:paymentId/download', 
  authenticate,
  validateRequest(commonValidationSchemas.uuid, 'params'),
  PaymentController.downloadProofOfPayment
);

// Admin routes
// Get all pending payments for review
router.get('/admin/pending', 
  authenticate, 
  requireAdmin,
  validateRequest(paginationValidation, 'query'),
  PaymentController.getPendingPayments
);

// Get all payments with optional status filter
router.get('/admin/all', 
  authenticate, 
  requireAdmin,
  validateRequest(paginationValidation, 'query'),
  PaymentController.getAllPayments
);

// Get payment statistics
router.get('/admin/statistics', 
  authenticate, 
  requireAdmin, 
  PaymentController.getPaymentStatistics
);

// Verify a payment
router.put('/admin/:paymentId/verify', 
  authenticate, 
  requireAdmin,
  validateContentType(['application/json']),
  validateRequest(commonValidationSchemas.uuid, 'params'),
  validateRequest(paymentValidationSchemas.verifyPayment),
  PaymentController.verifyPayment
);

// Reject a payment
router.put('/admin/:paymentId/reject', 
  authenticate, 
  requireAdmin,
  validateContentType(['application/json']),
  validateRequest(commonValidationSchemas.uuid, 'params'),
  validateRequest(paymentValidationSchemas.rejectPayment),
  PaymentController.rejectPayment
);

export default router;