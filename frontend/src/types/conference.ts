export type SessionType = 'CHE' | 'CSE' | 'BIO' | 'MST' | 'PFD';

export type ParticipantType = 
  // Presenters/Speakers
  | 'keynote_speaker'
  | 'oral_presenter' 
  | 'poster_presenter'
  | 'panelist'
  | 'workshop_leader'
  // Attendees
  | 'regular_participant'
  | 'observer'
  | 'industry_representative'
  // Organizers
  | 'conference_chair'
  | 'scientific_committee'
  | 'organizing_committee'
  | 'session_chair'
  // Support Roles
  | 'reviewer'
  | 'technical_support'
  | 'volunteer'
  // Special Guests
  | 'sponsor'
  | 'government_representative';

export interface SessionSchedule {
  id: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
}

export interface Session {
  id: string;
  type: SessionType;
  name: string;
  description?: string;
  schedules: SessionSchedule[];
}

export interface RegistrationFee {
  id: string;
  participantType: ParticipantType;
  earlyBirdFee: number;
  regularFee: number;
  lateFee: number;
  currency: string;
  earlyBirdDeadline: string;
  lateRegistrationStart: string;
}

export interface PaymentInstructions {
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

export interface Conference {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  venue: string;
  registrationDeadline: string;
  submissionDeadline: string;
  isActive: boolean;
  sessions: Session[];
  registrationFees: RegistrationFee[];
  paymentInstructions?: PaymentInstructions;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}