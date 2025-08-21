import { BaseEntity, ReviewRecommendation } from './database.js';

export interface Review extends BaseEntity {
  submissionId: string;
  reviewerId: string;
  score?: number;
  comments?: string;
  recommendation?: ReviewRecommendation;
  reviewDate: Date;
  isCompleted: boolean;
}

// DTOs for API requests/responses
export interface CreateReviewRequest {
  submissionId: string;
  score: number;
  comments: string;
  recommendation: ReviewRecommendation;
}

export interface UpdateReviewRequest {
  score?: number;
  comments?: string;
  recommendation?: ReviewRecommendation;
}

export interface ReviewResponse {
  id: string;
  submissionId: string;
  reviewerId: string;
  score?: number;
  comments?: string;
  recommendation?: ReviewRecommendation;
  reviewDate: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReviewAssignmentRequest {
  submissionId: string;
  reviewerId: string;
}

export interface ReviewerAssignment {
  reviewerId: string;
  submissionId: string;
  submissionTitle: string;
  sessionType: string;
  assignedDate: Date;
  isCompleted: boolean;
}