import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User management routes
router.get('/users', AdminController.getAllUsers);
router.get('/users/statistics', AdminController.getUserStatistics);
router.put('/users/:userId/role', AdminController.updateUserRole);
router.put('/users/:userId/payment-status', AdminController.updateUserPaymentStatus);
router.delete('/users/:userId', AdminController.deactivateUser);

// Submission and review monitoring routes
router.get('/submissions/statistics', AdminController.getSubmissionStatistics);
router.get('/reviews/progress', AdminController.getReviewProgress);
router.post('/reviews/send-reminders', AdminController.sendReviewReminders);
router.get('/monitoring/dashboard', AdminController.getMonitoringDashboard);

// System configuration and maintenance routes
router.get('/system/health', AdminController.getSystemHealth);
router.get('/system/config', AdminController.getSystemConfig);
router.put('/system/config', AdminController.updateSystemConfig);
router.post('/system/backup', AdminController.createBackup);
router.get('/system/logs', AdminController.getSystemLogs);

export default router;