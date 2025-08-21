import { BaseEntity, SessionType, ParticipantType } from './database.js';

export interface Conference extends BaseEntity {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  registrationDeadline: Date;
  submissionDeadline: Date;
  isActive: boolean;
}

export interface Session extends BaseEntity {
  conferenceId: string;
  type: SessionType;
  name: string;
  description?: string;
}

export interface SessionSchedule extends BaseEntity {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
}

export interface RegistrationFee extends BaseEntity {
  conferenceId: string;
  participantType: ParticipantType;
  earlyBirdFee: number;
  regularFee: number;
  lateFee: number;
  currency: string;
  earlyBirdDeadline: Date;
  lateRegistrationStart: Date;
}

export interface PaymentInstructions extends BaseEntity {
  conferenceId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  routingNumber?: string;
  acceptedMethods: string[];
  instructions: string;
  supportContact?: string;
}

// DTOs for API requests/responses
export interface CreateConferenceRequest {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  registrationDeadline: Date;
  submissionDeadline: Date;
}

export interface UpdateConferenceRequest {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  venue?: string;
  registrationDeadline?: Date;
  submissionDeadline?: Date;
  isActive?: boolean;
}

export interface ConferenceResponse {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  registrationDeadline: Date;
  submissionDeadline: Date;
  isActive: boolean;
  sessions: SessionResponse[];
  registrationFees: RegistrationFeeResponse[];
  paymentInstructions?: PaymentInstructionsResponse;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SessionResponse {
  id: string;
  type: SessionType;
  name: string;
  description?: string;
  schedules: SessionScheduleResponse[];
}

export interface SessionScheduleResponse {
  id: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
}

export interface RegistrationFeeResponse {
  id: string;
  participantType: ParticipantType;
  earlyBirdFee: number;
  regularFee: number;
  lateFee: number;
  currency: string;
  earlyBirdDeadline: Date;
  lateRegistrationStart: Date;
}

export interface PaymentInstructionsResponse {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  routingNumber?: string;
  acceptedMethods: string[];
  instructions: string;
  supportContact?: string;
}