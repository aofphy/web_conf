import { Request, Response } from 'express';
import { ReviewRepository } from '../models/ReviewRepository.js';
import { SubmissionRepository } from '../models/SubmissionRepository.js';
import { UserRepository } from '../models/UserRepository.js';
import { EmailService } from '../services/EmailService.js';
import { ReviewAssignmentRequest } from '../types/index.js';

export class ReviewController {
  private static emailService = new EmailService();
  // Get all reviewers (users with reviewer role)
  static async getReviewers(_req: Request, res: Response) {
    try {
      const reviewers = await UserRepository.findByRole('reviewer');
      
      res.json({
        success: true,
        data: reviewers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching reviewers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_REVIEWERS_ERROR',
          message: 'Failed to fetch reviewers'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get submissions available for review assignment
  static async getSubmissionsForAssignment(_req: Request, res: Response) {
    try {
      const submissions = await SubmissionRepository.findByStatus('submitted');
      
      res.json({
        success: true,
        data: submissions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching submissions for assignment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_SUBMISSIONS_ERROR',
          message: 'Failed to fetch submissions for assignment'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Assign reviewer to submission
  static async assignReviewer(req: Request, res: Response) {
    try {
      const { submissionId, reviewerId }: ReviewAssignmentRequest = req.body;

      if (!submissionId || !reviewerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Submission ID and Reviewer ID are required'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if reviewer is already assigned to this submission
      const isAlreadyAssigned = await ReviewRepository.isReviewerAssigned(submissionId, reviewerId);
      if (isAlreadyAssigned) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REVIEWER_ALREADY_ASSIGNED',
            message: 'Reviewer is already assigned to this submission'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Verify submission exists
      const submission = await SubmissionRepository.findById(submissionId);
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Verify reviewer exists and has reviewer role
      const reviewer = await UserRepository.findById(reviewerId);
      if (!reviewer || reviewer.role !== 'reviewer') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEWER_NOT_FOUND',
            message: 'Reviewer not found or user does not have reviewer role'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Assign reviewer
      const assignment = await ReviewRepository.assignReviewer(submissionId, reviewerId);

      // Send review assignment email
      try {
        // Set review deadline (e.g., 2 weeks from now)
        const reviewDeadline = new Date();
        reviewDeadline.setDate(reviewDeadline.getDate() + 14);

        await this.emailService.sendReviewAssignmentEmail(
          reviewer.email,
          `${reviewer.firstName} ${reviewer.lastName}`,
          submission,
          reviewDeadline
        );
      } catch (emailError) {
        console.error('Failed to send review assignment email:', emailError);
      }

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Reviewer assigned successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGN_REVIEWER_ERROR',
          message: 'Failed to assign reviewer'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get reviewer assignments for a specific reviewer
  static async getReviewerAssignments(req: Request, res: Response) {
    try {
      const { reviewerId } = req.params;

      if (!reviewerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REVIEWER_ID',
            message: 'Reviewer ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      const assignments = await ReviewRepository.getReviewerAssignments(reviewerId);

      res.json({
        success: true,
        data: assignments,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching reviewer assignments:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ASSIGNMENTS_ERROR',
          message: 'Failed to fetch reviewer assignments'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get all review assignments (admin view)
  static async getAllAssignments(_req: Request, res: Response) {
    try {
      const assignments = await ReviewRepository.getAllAssignments();

      res.json({
        success: true,
        data: assignments,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ALL_ASSIGNMENTS_ERROR',
          message: 'Failed to fetch all assignments'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Remove reviewer assignment
  static async removeAssignment(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REVIEW_ID',
            message: 'Review ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if review exists and is not completed
      const review = await ReviewRepository.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review assignment not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (review.isCompleted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REVIEW_COMPLETED',
            message: 'Cannot remove assignment for completed review'
          },
          timestamp: new Date().toISOString()
        });
      }

      const deleted = await ReviewRepository.delete(reviewId);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to remove assignment'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Reviewer assignment removed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_ASSIGNMENT_ERROR',
          message: 'Failed to remove reviewer assignment'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get expertise-based assignment suggestions
  static async getAssignmentSuggestions(req: Request, res: Response) {
    try {
      const { submissionId } = req.params;

      if (!submissionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SUBMISSION_ID',
            message: 'Submission ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      const suggestions = await ReviewRepository.getAssignmentSuggestions(submissionId);

      res.json({
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching assignment suggestions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_SUGGESTIONS_ERROR',
          message: 'Failed to fetch assignment suggestions'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Submit a review
  static async submitReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const { score, comments, recommendation } = req.body;

      if (!reviewId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REVIEW_ID',
            message: 'Review ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (!score || !comments || !recommendation) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Score, comments, and recommendation are required'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (score < 1 || score > 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SCORE',
            message: 'Score must be between 1 and 10'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if review exists and belongs to the current user
      const existingReview = await ReviewRepository.findById(reviewId);
      if (!existingReview) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (existingReview.isCompleted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REVIEW_ALREADY_COMPLETED',
            message: 'Review has already been completed'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update the review
      const updatedReview = await ReviewRepository.update(reviewId, {
        score,
        comments,
        recommendation
      });

      if (!updatedReview) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update review'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update submission status to under_review if this is the first completed review
      const submissionStats = await ReviewRepository.getSubmissionReviewStats(existingReview.submissionId);
      if (submissionStats.completedReviews === 1) {
        await SubmissionRepository.updateStatus(existingReview.submissionId, 'under_review');
      }

      res.json({
        success: true,
        data: updatedReview,
        message: 'Review submitted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBMIT_REVIEW_ERROR',
          message: 'Failed to submit review'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get review details for editing
  static async getReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;

      if (!reviewId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REVIEW_ID',
            message: 'Review ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      const review = await ReviewRepository.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: review,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_REVIEW_ERROR',
          message: 'Failed to fetch review'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get review progress for admin monitoring
  static async getReviewProgress(req: Request, res: Response) {
    try {
      const progress = await ReviewRepository.getReviewProgress();

      res.json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching review progress:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_PROGRESS_ERROR',
          message: 'Failed to fetch review progress'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get submission reviews with scores and recommendations
  static async getSubmissionReviews(req: Request, res: Response) {
    try {
      const { submissionId } = req.params;

      if (!submissionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SUBMISSION_ID',
            message: 'Submission ID is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      const reviews = await ReviewRepository.findBySubmissionId(submissionId);
      const stats = await ReviewRepository.getSubmissionReviewStats(submissionId);

      res.json({
        success: true,
        data: {
          reviews,
          stats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching submission reviews:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_SUBMISSION_REVIEWS_ERROR',
          message: 'Failed to fetch submission reviews'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}