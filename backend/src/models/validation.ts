import Joi from 'joi';
import { validateAbstractMarkdown } from '../utils/markdown.js';

// Common validation patterns
export const commonValidation = {
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  name: Joi.string().min(2).max(100).required(),
  optionalText: Joi.string().allow('').optional(),
  requiredText: Joi.string().min(1).required(),
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  date: Joi.date().iso().required(),
  optionalDate: Joi.date().iso().optional(),
};

// Enum validations
export const enumValidation = {
  participantType: Joi.string().valid(
    'keynote_speaker', 'oral_presenter', 'poster_presenter', 'panelist', 'workshop_leader',
    'regular_participant', 'observer', 'industry_representative',
    'conference_chair', 'scientific_committee', 'organizing_committee', 'session_chair',
    'reviewer', 'technical_support', 'volunteer',
    'sponsor', 'government_representative'
  ).required(),
  userRole: Joi.string().valid('participant', 'presenter', 'organizer', 'reviewer', 'admin').required(),
  sessionType: Joi.string().valid('CHE', 'CSE', 'BIO', 'MST', 'PFD').required(),
  presentationType: Joi.string().valid('oral', 'poster').required(),
  reviewRecommendation: Joi.string().valid('accept', 'reject', 'minor_revision', 'major_revision').required(),
  paymentMethod: Joi.string().valid('bank_transfer', 'credit_card', 'other').required(),
  paymentStatus: Joi.string().valid('pending', 'verified', 'rejected').required(),
};

// User validation schemas
export const userValidation = {
  createUser: Joi.object({
    email: commonValidation.email,
    password: commonValidation.password,
    firstName: commonValidation.name,
    lastName: commonValidation.name,
    affiliation: commonValidation.requiredText,
    country: commonValidation.requiredText,
    participantType: enumValidation.participantType,
    selectedSessions: Joi.array().items(enumValidation.sessionType).min(1).required(),
    bio: commonValidation.optionalText,
    expertise: Joi.array().items(Joi.string().min(1)).optional(),
  }),

  updateUser: Joi.object({
    firstName: commonValidation.name.optional(),
    lastName: commonValidation.name.optional(),
    affiliation: commonValidation.requiredText.optional(),
    country: commonValidation.requiredText.optional(),
    bio: commonValidation.optionalText,
    expertise: Joi.array().items(Joi.string().min(1)).optional(),
    selectedSessions: Joi.array().items(enumValidation.sessionType).min(1).optional(),
  }),

  login: Joi.object({
    email: commonValidation.email,
    password: Joi.string().required(),
  }),
};

// Custom markdown validation
const markdownAbstractValidation = Joi.string().custom((value, helpers) => {
  const validation = validateAbstractMarkdown(value);
  
  if (!validation.isValid) {
    return helpers.error('any.invalid', { 
      message: validation.errors.join('; ') 
    });
  }
  
  // Add warnings as context (they don't fail validation but can be used for user feedback)
  if (validation.warnings.length > 0) {
    helpers.state.warnings = validation.warnings;
  }
  
  return value;
});

// Submission validation schemas
export const submissionValidation = {
  createSubmission: Joi.object({
    title: Joi.string().min(10).max(500).required(),
    abstract: markdownAbstractValidation.required(),
    keywords: Joi.array().items(Joi.string().min(2).max(50)).min(3).max(10).required(),
    sessionType: enumValidation.sessionType,
    presentationType: enumValidation.presentationType,
    authors: Joi.array().items(Joi.object({
      name: commonValidation.name,
      affiliation: commonValidation.requiredText,
      email: commonValidation.email,
      isCorresponding: Joi.boolean().required(),
      authorOrder: Joi.number().integer().min(1).required(),
    })).min(1).required(),
    correspondingAuthor: commonValidation.email,
  }),

  updateSubmission: Joi.object({
    title: Joi.string().min(10).max(500).optional(),
    abstract: markdownAbstractValidation.optional(),
    keywords: Joi.array().items(Joi.string().min(2).max(50)).min(3).max(10).optional(),
    sessionType: enumValidation.sessionType.optional(),
    presentationType: enumValidation.presentationType.optional(),
    authors: Joi.array().items(Joi.object({
      name: commonValidation.name,
      affiliation: commonValidation.requiredText,
      email: commonValidation.email,
      isCorresponding: Joi.boolean().required(),
      authorOrder: Joi.number().integer().min(1).required(),
    })).min(1).optional(),
    correspondingAuthor: commonValidation.email.optional(),
  }),
};

// Review validation schemas
export const reviewValidation = {
  createReview: Joi.object({
    submissionId: commonValidation.uuid,
    score: Joi.number().integer().min(1).max(10).required(),
    comments: Joi.string().min(50).max(2000).required(),
    recommendation: enumValidation.reviewRecommendation,
  }),

  updateReview: Joi.object({
    score: Joi.number().integer().min(1).max(10).optional(),
    comments: Joi.string().min(50).max(2000).optional(),
    recommendation: enumValidation.reviewRecommendation.optional(),
  }),

  assignReviewer: Joi.object({
    submissionId: commonValidation.uuid,
    reviewerId: commonValidation.uuid,
  }),
};

// Payment validation schemas
export const paymentValidation = {
  createPayment: Joi.object({
    amount: commonValidation.positiveNumber,
    currency: Joi.string().length(3).uppercase().required(),
    paymentMethod: enumValidation.paymentMethod,
    transactionReference: Joi.string().max(255).optional(),
  }),

  updatePaymentStatus: Joi.object({
    status: enumValidation.paymentStatus,
    adminNotes: Joi.string().max(1000).optional(),
  }),

  verifyPayment: Joi.object({
    paymentId: commonValidation.uuid,
    status: Joi.string().valid('verified', 'rejected').required(),
    adminNotes: Joi.string().max(1000).optional(),
  }),
};

// Conference validation schemas
export const conferenceValidation = {
  createConference: Joi.object({
    name: Joi.string().min(5).max(255).required(),
    description: commonValidation.optionalText,
    startDate: commonValidation.date,
    endDate: commonValidation.date,
    venue: commonValidation.requiredText,
    registrationDeadline: commonValidation.date,
    submissionDeadline: commonValidation.date,
  }).custom((value, helpers) => {
    // Validate date relationships
    if (value.endDate <= value.startDate) {
      return helpers.error('any.invalid', { message: 'End date must be after start date' });
    }
    if (value.registrationDeadline >= value.startDate) {
      return helpers.error('any.invalid', { message: 'Registration deadline must be before conference start date' });
    }
    if (value.submissionDeadline >= value.registrationDeadline) {
      return helpers.error('any.invalid', { message: 'Submission deadline must be before registration deadline' });
    }
    return value;
  }),

  updateConference: Joi.object({
    name: Joi.string().min(5).max(255).optional(),
    description: commonValidation.optionalText,
    startDate: commonValidation.date.optional(),
    endDate: commonValidation.date.optional(),
    venue: commonValidation.requiredText.optional(),
    registrationDeadline: commonValidation.date.optional(),
    submissionDeadline: commonValidation.date.optional(),
    isActive: Joi.boolean().optional(),
  }),
};

// Pagination validation
export const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// File upload validation
export const fileValidation = {
  manuscript: {
    allowedTypes: ['application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  paymentProof: {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

// Validation helper functions
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export function validateConferenceData(data: any): ValidationResult {
  const { error } = conferenceValidation.createConference.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}

export function validateSessionData(data: any): ValidationResult {
  const sessionSchema = Joi.object({
    type: enumValidation.sessionType,
    name: commonValidation.name,
    description: commonValidation.optionalText,
  });
  
  const { error } = sessionSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}

export function validateRegistrationFeeData(data: any): ValidationResult {
  const feeSchema = Joi.object({
    earlyBirdFee: commonValidation.nonNegativeNumber,
    regularFee: commonValidation.nonNegativeNumber,
    lateFee: commonValidation.nonNegativeNumber,
    currency: Joi.string().length(3).uppercase().required(),
    earlyBirdDeadline: commonValidation.date,
    lateRegistrationStart: commonValidation.date,
  }).custom((value, helpers) => {
    if (value.regularFee < value.earlyBirdFee) {
      return helpers.error('any.invalid', { message: 'Regular fee must be greater than or equal to early bird fee' });
    }
    if (value.lateFee < value.regularFee) {
      return helpers.error('any.invalid', { message: 'Late fee must be greater than or equal to regular fee' });
    }
    if (value.lateRegistrationStart <= value.earlyBirdDeadline) {
      return helpers.error('any.invalid', { message: 'Late registration start must be after early bird deadline' });
    }
    return value;
  });
  
  const { error } = feeSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}

export function validateUserData(data: any): ValidationResult {
  const { error } = userValidation.createUser.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}

export function validateSubmissionData(data: any): ValidationResult & { warnings?: string[] } {
  const { error, warning, value } = submissionValidation.createSubmission.validate(data, { 
    abortEarly: false,
    allowUnknown: false,
    context: { warnings: [] }
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  // Extract warnings from markdown validation
  const warnings: string[] = [];
  if (data.abstract) {
    const markdownValidation = validateAbstractMarkdown(data.abstract);
    warnings.push(...markdownValidation.warnings);
  }
  
  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function validateReviewData(data: any): ValidationResult {
  const { error } = reviewValidation.createReview.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}

export function validatePaymentData(data: any): ValidationResult {
  const { error } = paymentValidation.createPayment.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
}