// Database enum types matching PostgreSQL enums

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

export type PresentationType = 'oral' | 'poster';

export type SubmissionStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected';

export type ReviewRecommendation = 'accept' | 'reject' | 'minor_revision' | 'major_revision';

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'other';

export type PaymentRecordStatus = 'pending' | 'verified' | 'rejected';

// Base interface for all database entities
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}