// User-related types for frontend

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

export type UserRole = 'participant' | 'presenter' | 'organizer' | 'reviewer' | 'admin';

export type PaymentStatus = 'not_paid' | 'payment_submitted' | 'payment_verified' | 'payment_rejected';

export type SessionType = 'CHE' | 'CSE' | 'BIO' | 'MST' | 'PFD';

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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
  expiresIn: string;
}