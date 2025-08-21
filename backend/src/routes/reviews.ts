import express from 'express';
import { ReviewController } from '../controllers/ReviewController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Admin routes for reviewer assignment
router.get('/reviewers', authenticate, authorize('admin', 'organizer'), ReviewController.getReviewers);
router.get('/submissions/available', authenticate, authorize('admin', 'organizer'), ReviewController.getSubmissionsForAssignment);
router.post('/assign', authenticate, authorize('admin', 'organizer'), ReviewController.assignReviewer);
router.get('/assignments', authenticate, authorize('admin', 'organizer'), ReviewController.getAllAssignments);
router.delete('/assignments/:reviewId', authenticate, authorize('admin', 'organizer'), ReviewController.removeAssignment);
router.get('/suggestions/:submissionId', authenticate, authorize('admin', 'organizer'), ReviewController.getAssignmentSuggestions);

// Reviewer routes
router.get('/reviewer/:reviewerId/assignments', authenticate, authorize('reviewer', 'admin', 'organizer'), ReviewController.getReviewerAssignments);

// Review submission and management
router.get('/:reviewId', authenticate, authorize('reviewer', 'admin', 'organizer'), ReviewController.getReview);
router.put('/:reviewId', authenticate, authorize('reviewer', 'admin', 'organizer'), ReviewController.submitReview);

// Admin monitoring routes
router.get('/progress/overview', authenticate, authorize('admin', 'organizer'), ReviewController.getReviewProgress);
router.get('/submission/:submissionId/reviews', authenticate, authorize('admin', 'organizer'), ReviewController.getSubmissionReviews);

export default router;