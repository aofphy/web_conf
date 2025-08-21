import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateConferenceData,
  validateSessionData,
  validateRegistrationFeeData,
  validateUserData,
  validateSubmissionData,
  validateReviewData,
  validatePaymentData,
  userValidation,
  submissionValidation,
  reviewValidation,
  paymentValidation,
  conferenceValidation,
  paginationValidation,
  fileValidation
} from '../../models/validation';

describe('Validation Models', () => {
  describe('validateUserData', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      affiliation: 'University of Test',
      country: 'Test Country',
      participantType: 'regular_participant',
      selectedSessions: ['CHE', 'CSE'],
      bio: 'Test bio',
      expertise: ['machine learning', 'data science']
    };

    it('should validate correct user data', () => {
      const result = validateUserData(validUserData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      const result = validateUserData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('valid email'));
    });

    it('should reject weak password', () => {
      const invalidData = { ...validUserData, password: 'weak' };
      const result = validateUserData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Password must contain'));
    });

    it('should reject invalid participant type', () => {
      const invalidData = { ...validUserData, participantType: 'invalid_type' };
      const result = validateUserData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should require at least one selected session', () => {
      const invalidData = { ...validUserData, selectedSessions: [] };
      const result = validateUserData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid session types', () => {
      const invalidData = { ...validUserData, selectedSessions: ['INVALID'] };
      const result = validateUserData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateSubmissionData', () => {
    const validSubmissionData = {
      title: 'A Novel Approach to Machine Learning',
      abstract: `# Abstract

This research presents a comprehensive methodology for improving machine learning algorithms.
Our approach involves detailed analysis and experimental validation.
The results demonstrate significant improvements in accuracy and performance.
These findings show promising applications in various domains.`,
      keywords: ['machine learning', 'algorithms', 'performance'],
      sessionType: 'CSE',
      presentationType: 'oral',
      authors: [{
        name: 'John Doe',
        affiliation: 'University of Test',
        email: 'john@example.com',
        isCorresponding: true,
        authorOrder: 1
      }],
      correspondingAuthor: 'john@example.com'
    };

    it('should validate correct submission data', () => {
      const result = validateSubmissionData(validSubmissionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject short title', () => {
      const invalidData = { ...validSubmissionData, title: 'Short' };
      const result = validateSubmissionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should require minimum keywords', () => {
      const invalidData = { ...validSubmissionData, keywords: ['one', 'two'] };
      const result = validateSubmissionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid session type', () => {
      const invalidData = { ...validSubmissionData, sessionType: 'INVALID' };
      const result = validateSubmissionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should require at least one author', () => {
      const invalidData = { ...validSubmissionData, authors: [] };
      const result = validateSubmissionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate author data', () => {
      const invalidData = {
        ...validSubmissionData,
        authors: [{
          name: 'A', // Too short
          affiliation: '',
          email: 'invalid-email',
          isCorresponding: true,
          authorOrder: 1
        }]
      };
      const result = validateSubmissionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateReviewData', () => {
    const validReviewData = {
      submissionId: '123e4567-e89b-12d3-a456-426614174000',
      score: 8,
      comments: 'This is a well-written paper with solid methodology and clear results. The authors have addressed the research question effectively.',
      recommendation: 'accept'
    };

    it('should validate correct review data', () => {
      const result = validateReviewData(validReviewData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid UUID', () => {
      const invalidData = { ...validReviewData, submissionId: 'invalid-uuid' };
      const result = validateReviewData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject score out of range', () => {
      const invalidData = { ...validReviewData, score: 11 };
      const result = validateReviewData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should require minimum comment length', () => {
      const invalidData = { ...validReviewData, comments: 'Too short' };
      const result = validateReviewData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid recommendation', () => {
      const invalidData = { ...validReviewData, recommendation: 'invalid' };
      const result = validateReviewData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validatePaymentData', () => {
    const validPaymentData = {
      amount: 300,
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      transactionReference: 'TXN123456'
    };

    it('should validate correct payment data', () => {
      const result = validatePaymentData(validPaymentData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject negative amount', () => {
      const invalidData = { ...validPaymentData, amount: -100 };
      const result = validatePaymentData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid currency format', () => {
      const invalidData = { ...validPaymentData, currency: 'us' };
      const result = validatePaymentData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid payment method', () => {
      const invalidData = { ...validPaymentData, paymentMethod: 'invalid_method' };
      const result = validatePaymentData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateConferenceData', () => {
    const validConferenceData = {
      name: 'International Conference on Computer Science',
      description: 'A premier conference for computer science research',
      startDate: '2024-06-15T09:00:00.000Z',
      endDate: '2024-06-17T17:00:00.000Z',
      venue: 'Convention Center, City',
      registrationDeadline: '2024-05-15T23:59:59.000Z',
      submissionDeadline: '2024-04-15T23:59:59.000Z'
    };

    it('should validate correct conference data', () => {
      const result = validateConferenceData(validConferenceData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        ...validConferenceData,
        startDate: '2024-06-17T09:00:00.000Z',
        endDate: '2024-06-15T17:00:00.000Z'
      };
      const result = validateConferenceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be after start date');
    });

    it('should reject registration deadline after start date', () => {
      const invalidData = {
        ...validConferenceData,
        registrationDeadline: '2024-06-16T23:59:59.000Z'
      };
      const result = validateConferenceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Registration deadline must be before conference start date');
    });

    it('should reject submission deadline after registration deadline', () => {
      const invalidData = {
        ...validConferenceData,
        submissionDeadline: '2024-05-16T23:59:59.000Z'
      };
      const result = validateConferenceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Submission deadline must be before registration deadline');
    });
  });

  describe('validateSessionData', () => {
    const validSessionData = {
      type: 'CHE',
      name: 'Computational Chemistry',
      description: 'Session focused on computational chemistry research'
    };

    it('should validate correct session data', () => {
      const result = validateSessionData(validSessionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid session type', () => {
      const invalidData = { ...validSessionData, type: 'INVALID' };
      const result = validateSessionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject short name', () => {
      const invalidData = { ...validSessionData, name: 'A' };
      const result = validateSessionData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateRegistrationFeeData', () => {
    const validFeeData = {
      earlyBirdFee: 200,
      regularFee: 300,
      lateFee: 400,
      currency: 'USD',
      earlyBirdDeadline: '2024-04-01T23:59:59.000Z',
      lateRegistrationStart: '2024-05-01T00:00:00.000Z'
    };

    it('should validate correct fee data', () => {
      const result = validateRegistrationFeeData(validFeeData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject regular fee less than early bird fee', () => {
      const invalidData = { ...validFeeData, regularFee: 150 };
      const result = validateRegistrationFeeData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Regular fee must be greater than or equal to early bird fee');
    });

    it('should reject late fee less than regular fee', () => {
      const invalidData = { ...validFeeData, lateFee: 250 };
      const result = validateRegistrationFeeData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Late fee must be greater than or equal to regular fee');
    });

    it('should reject late registration start before early bird deadline', () => {
      const invalidData = {
        ...validFeeData,
        lateRegistrationStart: '2024-03-15T00:00:00.000Z'
      };
      const result = validateRegistrationFeeData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Late registration start must be after early bird deadline');
    });
  });

  describe('Joi Schema Validations', () => {
    describe('userValidation.login', () => {
      it('should validate correct login data', () => {
        const loginData = {
          email: 'test@example.com',
          password: 'anypassword'
        };
        
        const { error } = userValidation.login.validate(loginData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid email in login', () => {
        const loginData = {
          email: 'invalid-email',
          password: 'anypassword'
        };
        
        const { error } = userValidation.login.validate(loginData);
        expect(error).toBeDefined();
      });
    });

    describe('paginationValidation', () => {
      it('should validate correct pagination data', () => {
        const paginationData = {
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        };
        
        const { error } = paginationValidation.validate(paginationData);
        expect(error).toBeUndefined();
      });

      it('should apply defaults for missing values', () => {
        const { error, value } = paginationValidation.validate({});
        
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
        expect(value.sortOrder).toBe('desc');
      });

      it('should reject invalid sort order', () => {
        const paginationData = {
          sortOrder: 'invalid'
        };
        
        const { error } = paginationValidation.validate(paginationData);
        expect(error).toBeDefined();
      });
    });

    describe('fileValidation', () => {
      it('should have correct manuscript validation rules', () => {
        expect(fileValidation.manuscript.allowedTypes).toContain('application/pdf');
        expect(fileValidation.manuscript.maxSize).toBe(10 * 1024 * 1024);
      });

      it('should have correct payment proof validation rules', () => {
        expect(fileValidation.paymentProof.allowedTypes).toContain('application/pdf');
        expect(fileValidation.paymentProof.allowedTypes).toContain('image/jpeg');
        expect(fileValidation.paymentProof.allowedTypes).toContain('image/png');
        expect(fileValidation.paymentProof.maxSize).toBe(5 * 1024 * 1024);
      });
    });
  });
});