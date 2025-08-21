-- Initial database schema for International Conference Website
-- Migration 001: Create core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE participant_type AS ENUM (
    'keynote_speaker',
    'oral_presenter',
    'poster_presenter',
    'panelist',
    'workshop_leader',
    'regular_participant',
    'observer',
    'industry_representative',
    'conference_chair',
    'scientific_committee',
    'organizing_committee',
    'session_chair',
    'reviewer',
    'technical_support',
    'volunteer',
    'sponsor',
    'government_representative'
);

CREATE TYPE user_role AS ENUM (
    'participant',
    'presenter',
    'organizer',
    'reviewer',
    'admin'
);

CREATE TYPE payment_status AS ENUM (
    'not_paid',
    'payment_submitted',
    'payment_verified',
    'payment_rejected'
);

CREATE TYPE session_type AS ENUM (
    'CHE',
    'CSE',
    'BIO',
    'MST',
    'PFD'
);

CREATE TYPE presentation_type AS ENUM (
    'oral',
    'poster'
);

CREATE TYPE submission_status AS ENUM (
    'submitted',
    'under_review',
    'accepted',
    'rejected'
);

CREATE TYPE review_recommendation AS ENUM (
    'accept',
    'reject',
    'minor_revision',
    'major_revision'
);

CREATE TYPE payment_method AS ENUM (
    'bank_transfer',
    'credit_card',
    'other'
);

CREATE TYPE payment_record_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    affiliation VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    participant_type participant_type NOT NULL,
    role user_role NOT NULL DEFAULT 'participant',
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    bio TEXT,
    expertise TEXT[],
    payment_status payment_status DEFAULT 'not_paid',
    registration_fee DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User selected sessions (many-to-many relationship)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type session_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_type)
);

-- Conference table
CREATE TABLE conferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    venue TEXT NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    type session_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session schedules
CREATE TABLE session_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registration fees
CREATE TABLE registration_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    participant_type participant_type NOT NULL,
    early_bird_fee DECIMAL(10,2) NOT NULL,
    regular_fee DECIMAL(10,2) NOT NULL,
    late_fee DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    early_bird_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    late_registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conference_id, participant_type)
);

-- Payment instructions
CREATE TABLE payment_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    swift_code VARCHAR(20),
    routing_number VARCHAR(20),
    accepted_methods TEXT[],
    instructions TEXT NOT NULL,
    support_contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    abstract TEXT NOT NULL,
    abstract_html TEXT,
    keywords TEXT[],
    session_type session_type NOT NULL,
    presentation_type presentation_type NOT NULL,
    status submission_status DEFAULT 'submitted',
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    manuscript_path VARCHAR(500),
    corresponding_author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Authors table (for multiple authors per submission)
CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    affiliation VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_corresponding BOOLEAN DEFAULT false,
    author_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 10),
    comments TEXT,
    recommendation review_recommendation,
    review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, reviewer_id)
);

-- Payment records table
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method payment_method DEFAULT 'bank_transfer',
    proof_of_payment_path VARCHAR(500),
    transaction_reference VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status payment_record_status DEFAULT 'pending',
    admin_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_participant_type ON users(participant_type);
CREATE INDEX idx_users_payment_status ON users(payment_status);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_session_type ON submissions(session_type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_authors_submission_id ON authors(submission_id);
CREATE INDEX idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_sessions_conference_id ON sessions(conference_id);
CREATE INDEX idx_session_schedules_session_id ON session_schedules(session_id);
CREATE INDEX idx_registration_fees_conference_id ON registration_fees(conference_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conferences_updated_at BEFORE UPDATE ON conferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_instructions_updated_at BEFORE UPDATE ON payment_instructions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();