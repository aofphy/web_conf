import { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Admin-only routes for session management
router.post('/conference/:conferenceId', authenticate, requireAdmin, SessionController.createSession);
router.put('/:id', authenticate, requireAdmin, SessionController.updateSession);
router.delete('/:id', authenticate, requireAdmin, SessionController.deleteSession);

// Session schedule management
router.post('/:sessionId/schedules', authenticate, requireAdmin, SessionController.addSessionSchedule);
router.put('/schedules/:scheduleId', authenticate, requireAdmin, SessionController.updateSessionSchedule);
router.delete('/schedules/:scheduleId', authenticate, requireAdmin, SessionController.deleteSessionSchedule);

export default router;