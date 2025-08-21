# Requirements Document

## Introduction

This document outlines the requirements for an international academic conference website that supports participant registration, research paper submissions across multiple academic sessions, manuscript submission and review processes, and comprehensive conference information management. The system will handle five main academic sessions: Computational Chemistry (CHE), High Performance Computing/Computer Science/Engineering (CSE), Computational Biology/Bioinformatics/Biochemistry/Biophysics (BIO), Mathematics and Statistics (MST), and Computational Physics/Computational Fluid Dynamics/Solid Mechanics (PFD), with support for both oral and poster presentations.

## Requirements

### Requirement 1

**User Story:** As a conference participant, I want to register for the conference with my specific participant type and role, so that I can access appropriate features and participate according to my involvement level.

#### Acceptance Criteria

1. WHEN a user accesses the registration page THEN the system SHALL display participant type selection including presenters/speakers, attendees, organizers, support roles, and special guests
2. WHEN a user selects their participant type THEN the system SHALL display relevant registration fields and permissions for that type
3. WHEN a user submits valid registration information THEN the system SHALL create a user account with appropriate role permissions and send a confirmation email
4. WHEN a presenter registers THEN the system SHALL provide additional fields for bio, expertise areas, and presentation preferences
5. IF a user provides incomplete registration information THEN the system SHALL display validation errors and prevent submission

### Requirement 2

**User Story:** As a researcher, I want to submit my research abstract in markdown format to appropriate academic sessions with oral or poster presentation options, so that I can share my findings with the academic community in a well-formatted manner.

#### Acceptance Criteria

1. WHEN a registered user accesses the submission portal THEN the system SHALL display available sessions (CHE, CSE, BIO, MST, PFD) with submission guidelines and markdown formatting help
2. WHEN a user submits a research abstract THEN the system SHALL require title, abstract in markdown format, keywords, author information, session selection, and presentation type (oral/poster)
3. WHEN a user types in the markdown editor THEN the system SHALL provide real-time preview of the formatted abstract
4. WHEN a submission is completed THEN the system SHALL generate a unique submission ID, render HTML from markdown, and send confirmation to the submitter
5. WHEN the submission deadline passes THEN the system SHALL prevent new submissions and display appropriate messaging

### Requirement 3

**User Story:** As a researcher, I want to submit full manuscripts for review, so that my work can be evaluated for publication or presentation acceptance.

#### Acceptance Criteria

1. WHEN a user with an accepted abstract accesses manuscript submission THEN the system SHALL allow file upload of PDF documents up to 10MB
2. WHEN a manuscript is submitted THEN the system SHALL validate file format, size, and associate it with the corresponding abstract submission
3. WHEN manuscript submission is successful THEN the system SHALL update submission status and notify the author
4. IF a manuscript fails validation THEN the system SHALL display specific error messages and allow resubmission

### Requirement 4

**User Story:** As a committee member, I want to review submitted manuscripts and abstracts, so that I can evaluate their quality and provide feedback for acceptance decisions.

#### Acceptance Criteria

1. WHEN a committee member logs into the review portal THEN the system SHALL display assigned submissions based on their expertise area
2. WHEN a reviewer accesses a submission THEN the system SHALL display the abstract, manuscript (if available), and review form with scoring criteria
3. WHEN a review is submitted THEN the system SHALL save the review, update submission status, and notify relevant parties
4. WHEN all required reviews are completed for a submission THEN the system SHALL calculate average scores and update acceptance status

### Requirement 5

**User Story:** As a conference organizer, I want to manage conference information and schedules, so that attendees can access up-to-date information about the event.

#### Acceptance Criteria

1. WHEN users visit the conference website THEN the system SHALL display conference dates, venue information, keynote speakers, and session schedules
2. WHEN organizers update conference information THEN the system SHALL immediately reflect changes on the public website
3. WHEN users access session information THEN the system SHALL display detailed schedules for each academic track (CHE, CSE, BIO, MST, PFD)
4. WHEN the conference schedule is finalized THEN the system SHALL generate downloadable program guides in PDF format

### Requirement 6

**User Story:** As a conference participant, I want to access my registration status and submission information, so that I can track my participation and prepare accordingly.

#### Acceptance Criteria

1. WHEN a registered user logs into their account THEN the system SHALL display their registration status, selected sessions, and submission history
2. WHEN a user has pending submissions THEN the system SHALL show submission status (under review, accepted, rejected) and reviewer feedback when available
3. WHEN a user's presentation is accepted THEN the system SHALL provide presentation guidelines and schedule information
4. IF a user needs to modify their registration THEN the system SHALL allow updates within specified deadlines

### Requirement 7

**User Story:** As a system administrator, I want to manage user accounts, system settings, and generate abstract books, so that I can ensure smooth operation of the conference website and provide comprehensive conference materials.

#### Acceptance Criteria

1. WHEN an administrator accesses the admin panel THEN the system SHALL display user management, submission statistics, and system configuration options
2. WHEN an administrator needs to modify user permissions THEN the system SHALL allow role assignment (attendee, reviewer, organizer, admin)
3. WHEN system maintenance is required THEN the system SHALL provide backup and restore functionality for all conference data
4. WHEN generating reports THEN the system SHALL provide registration statistics, submission analytics, and review progress reports
5. WHEN an administrator wants to create an abstract book THEN the system SHALL compile all accepted abstracts organized by session type with proper formatting
6. WHEN generating the abstract book THEN the system SHALL provide options for PDF, HTML, and print-ready formats with customizable styling and conference branding

### Requirement 8

**User Story:** As a conference organizer, I want to generate and customize abstract books for distribution, so that participants can have a comprehensive reference of all accepted research presentations.

#### Acceptance Criteria

1. WHEN an organizer accesses the abstract book generator THEN the system SHALL display options to filter by session type, presentation type, and acceptance status
2. WHEN generating an abstract book THEN the system SHALL automatically format abstracts with author information, affiliations, and session details
3. WHEN customizing the abstract book THEN the system SHALL allow modification of cover page, table of contents, and session organization
4. WHEN the abstract book is ready THEN the system SHALL provide download options in multiple formats (PDF, HTML, DOCX) with proper pagination and indexing

### Requirement 9

**User Story:** As a conference participant, I want to submit proof of payment for my registration fee, so that I can complete my registration and gain access to conference materials and sessions.

#### Acceptance Criteria

1. WHEN a registered user accesses their payment section THEN the system SHALL display their registration fee amount, payment instructions, and bank details
2. WHEN a user uploads proof of payment THEN the system SHALL accept image files (JPG, PNG) or PDF documents up to 5MB
3. WHEN payment proof is submitted THEN the system SHALL update the user's payment status to "payment_submitted" and notify administrators
4. WHEN a user has submitted payment proof THEN the system SHALL display the current verification status and estimated processing time
5. IF payment verification is rejected THEN the system SHALL allow users to resubmit with updated proof and admin feedback

### Requirement 10

**User Story:** As an administrator, I want to review and verify payment submissions from participants, so that I can confirm their registration status and grant appropriate access.

#### Acceptance Criteria

1. WHEN an administrator accesses the payment verification panel THEN the system SHALL display all pending payment submissions with user details and uploaded proof
2. WHEN reviewing a payment submission THEN the system SHALL allow viewing the proof of payment document and user registration information
3. WHEN verifying a payment THEN the system SHALL update the user's payment status to "payment_verified" and send confirmation email to the participant
4. WHEN rejecting a payment THEN the system SHALL require admin notes explaining the rejection reason and notify the participant
5. WHEN payment is verified THEN the system SHALL automatically grant the user access to submit abstracts and access conference materials