import { BaseEntity, ParticipantType, UserRole, PaymentStatus, SessionType } from './database.js';

export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  affiliation: string;
  country: string;
  participantType: ParticipantType;
  role: UserRole;
  registrationDate: Date;
  isActive: boolean;
  bio?: string;
  expertise?: string[];
  paymentStatus: PaymentStatus;
  registrationFee: number;
}

export interface UserSession extends BaseEntity {
  userId: string;
  sessionType: SessionType;
}

// DTOs for API requests/responses
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  affiliation: string;
  country: string;
  participantType: ParticipantType;
  selectedSessions: SessionType[];
  bio?: string;
  expertise?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  affiliation?: string;
  country?: string;
  bio?: string;
  expertise?: string[];
  selectedSessions?: SessionType[];
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  affiliation: string;
  country: string;
  participantType: ParticipantType;
  role: UserRole;
  registrationDate: Date;
  isActive: boolean;
  bio?: string;
  expertise?: string[];
  paymentStatus: PaymentStatus;
  registrationFee: number;
  selectedSessions: SessionType[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
  expiresIn: string;
}