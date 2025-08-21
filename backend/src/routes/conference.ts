import { Router } from 'express';
import { ConferenceController } from '../controllers/ConferenceController.js';
import { PaymentInstructionsController } from '../controllers/PaymentInstructionsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { conferenceCache, paymentInstructionsCache } from '../middleware/cache.js';

const router = Router();

// Public routes - accessible to all users
router.get('/active', conferenceCache, ConferenceController.getActiveConference);
router.get('/:id', conferenceCache, ConferenceController.getConferenceById);
router.get('/:id/sessions', conferenceCache, ConferenceController.getConferenceSessions);
router.get('/:id/fees', conferenceCache, ConferenceController.getRegistrationFees);
router.get('/:id/payment-instructions', paymentInstructionsCache, ConferenceController.getPaymentInstructions);

// Admin-only routes - require authentication and admin role
router.post('/', authenticate, requireAdmin, ConferenceController.createConference);
router.put('/:id', authenticate, requireAdmin, ConferenceController.updateConference);
router.put('/:id/fees/:participantType', authenticate, requireAdmin, ConferenceController.updateRegistrationFee);
router.put('/:conferenceId/payment-instructions', authenticate, requireAdmin, PaymentInstructionsController.upsertPaymentInstructions);
router.delete('/:conferenceId/payment-instructions', authenticate, requireAdmin, PaymentInstructionsController.deletePaymentInstructions);

export default router;