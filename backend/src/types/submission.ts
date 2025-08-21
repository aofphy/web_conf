import { BaseEntity, SessionType, PresentationType, SubmissionStatus } from './database.js';
import { ReviewResponse } from './review.js';

export interface Submission extends BaseEntity {
  userId: string;
  title: string;
  abstract: string;
  abstractHtml?: string;
  keywords: string[];
  sessionType: SessionType;
  presentationType: PresentationType;
  status: SubmissionStatus;
  submissionDate: Date;
  manuscriptPath?: string;
  correspondingAuthor: string;
}

export interface Author extends BaseEntity {
  submissionId: string;
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
  authorOrder: number;
}

// DTOs for API requests/responses
export interface CreateSubmissionRequest {
  title: string;
  abstract: string;
  keywords: string[];
  sessionType: SessionType;
  presentationType: PresentationType;
  authors: CreateAuthorRequest[];
  correspondingAuthor: string;
}

export interface CreateAuthorRequest {
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
  authorOrder: number;
}

export interface UpdateSubmissionRequest {
  title?: string;
  abstract?: string;
  keywords?: string[];
  sessionType?: SessionType;
  presentationType?: PresentationType;
  authors?: CreateAuthorRequest[];
  correspondingAuthor?: string;
}

export interface SubmissionResponse {
  id: string;
  userId: string;
  title: string;
  abstract: string;
  abstractHtml?: string;
  keywords: string[];
  sessionType: SessionType;
  presentationType: PresentationType;
  status: SubmissionStatus;
  submissionDate: Date;
  manuscriptPath?: string;
  correspondingAuthor: string;
  authors: AuthorResponse[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthorResponse {
  id: string;
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
  authorOrder: number;
}

export interface SubmissionWithReviews extends SubmissionResponse {
  reviews: ReviewResponse[];
  averageScore?: number;
}

// ReviewResponse is imported from review types