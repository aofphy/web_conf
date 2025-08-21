// Export all database types
export * from './database.js';

// Export all entity types
export * from './user.js';
export * from './submission.js';
export * from './review.js';
export * from './payment.js';
export * from './conference.js';

// Export auth types
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    participantType: string;
    id: string;
  };
}

import { Request } from 'express';

// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// File upload types
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string;
  uploadDate: Date;
}

// Statistics and analytics types
export interface RegistrationStats {
  totalRegistrations: number;
  registrationsByType: Record<string, number>;
  registrationsBySession: Record<string, number>;
  paymentStats: {
    totalPaid: number;
    totalPending: number;
    totalVerified: number;
    totalRejected: number;
  };
}

export interface SubmissionStats {
  totalSubmissions: number;
  submissionsBySession: Record<string, number>;
  submissionsByStatus: Record<string, number>;
  submissionsByType: Record<string, number>;
}

export interface ReviewStats {
  totalReviews: number;
  completedReviews: number;
  pendingReviews: number;
  averageScore: number;
  reviewsByRecommendation: Record<string, number>;
}