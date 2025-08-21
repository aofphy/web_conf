// Client-side validation utilities

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  name: /^[a-zA-Z\s\-']{2,100}$/,
  phone: /^\+?[\d\s\-\(\)]{10,20}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
};

// Validation rules
export const validationRules = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return 'At least one item is required';
    }
    return null;
  },

  email: (value: string) => {
    if (!value) return null;
    if (!validationPatterns.email.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (value: string) => {
    if (!value) return null;
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!validationPatterns.password.test(value)) {
      return 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character';
    }
    return null;
  },

  confirmPassword: (value: string, originalPassword: string) => {
    if (!value) return null;
    if (value !== originalPassword) {
      return 'Passwords do not match';
    }
    return null;
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },

  minWords: (min: number) => (value: string) => {
    if (!value) return null;
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount < min) {
      return `Must contain at least ${min} words`;
    }
    return null;
  },

  maxWords: (max: number) => (value: string) => {
    if (!value) return null;
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount > max) {
      return `Must contain no more than ${max} words`;
    }
    return null;
  },

  name: (value: string) => {
    if (!value) return null;
    if (!validationRules.minLength(2)(value)) {
      return 'Name must be at least 2 characters long';
    }
    if (!validationRules.maxLength(100)(value)) {
      return 'Name must be no more than 100 characters long';
    }
    if (!validationPatterns.name.test(value)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  },

  url: (value: string) => {
    if (!value) return null;
    if (!validationPatterns.url.test(value)) {
      return 'Please enter a valid URL';
    }
    return null;
  },

  phone: (value: string) => {
    if (!value) return null;
    if (!validationPatterns.phone.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  positiveNumber: (value: number | string) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  nonNegativeNumber: (value: number | string) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0) {
      return 'Must be a non-negative number';
    }
    return null;
  },

  integer: (value: number | string) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || !Number.isInteger(num)) {
      return 'Must be a whole number';
    }
    return null;
  },

  range: (min: number, max: number) => (value: number | string) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < min || num > max) {
      return `Must be between ${min} and ${max}`;
    }
    return null;
  },

  arrayMinLength: (min: number) => (value: any[]) => {
    if (!value) return null;
    if (!Array.isArray(value) || value.length < min) {
      return `Must select at least ${min} item${min > 1 ? 's' : ''}`;
    }
    return null;
  },

  arrayMaxLength: (max: number) => (value: any[]) => {
    if (!value) return null;
    if (!Array.isArray(value) || value.length > max) {
      return `Must select no more than ${max} item${max > 1 ? 's' : ''}`;
    }
    return null;
  },

  oneOf: (allowedValues: any[]) => (value: any) => {
    if (!value) return null;
    if (!allowedValues.includes(value)) {
      return `Must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },

  date: (value: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  futureDate: (value: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    if (date <= new Date()) {
      return 'Date must be in the future';
    }
    return null;
  },

  pastDate: (value: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    if (date >= new Date()) {
      return 'Date must be in the past';
    }
    return null;
  },

  dateAfter: (afterDate: string | Date) => (value: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    const compareDate = new Date(afterDate);
    if (isNaN(date.getTime()) || isNaN(compareDate.getTime())) {
      return 'Please enter a valid date';
    }
    if (date <= compareDate) {
      return `Date must be after ${compareDate.toLocaleDateString()}`;
    }
    return null;
  },

  dateBefore: (beforeDate: string | Date) => (value: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    const compareDate = new Date(beforeDate);
    if (isNaN(date.getTime()) || isNaN(compareDate.getTime())) {
      return 'Please enter a valid date';
    }
    if (date >= compareDate) {
      return `Date must be before ${compareDate.toLocaleDateString()}`;
    }
    return null;
  },
};

// File validation rules
export const fileValidationRules = {
  required: (file: File | null) => {
    if (!file) {
      return 'Please select a file';
    }
    return null;
  },

  maxSize: (maxSizeBytes: number) => (file: File | null) => {
    if (!file) return null;
    if (file.size > maxSizeBytes) {
      const maxSizeMB = maxSizeBytes / (1024 * 1024);
      return `File size must be less than ${maxSizeMB}MB`;
    }
    return null;
  },

  allowedTypes: (allowedMimeTypes: string[]) => (file: File | null) => {
    if (!file) return null;
    if (!allowedMimeTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`;
    }
    return null;
  },

  allowedExtensions: (allowedExtensions: string[]) => (file: File | null) => {
    if (!file) return null;
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`;
    }
    return null;
  },

  manuscriptFile: (file: File | null) => {
    const errors = [
      fileValidationRules.required(file),
      fileValidationRules.maxSize(10 * 1024 * 1024)(file), // 10MB
      fileValidationRules.allowedTypes(['application/pdf'])(file),
      fileValidationRules.allowedExtensions(['.pdf'])(file),
    ].filter(Boolean);
    
    return errors.length > 0 ? errors[0] : null;
  },

  paymentProofFile: (file: File | null) => {
    const errors = [
      fileValidationRules.required(file),
      fileValidationRules.maxSize(5 * 1024 * 1024)(file), // 5MB
      fileValidationRules.allowedTypes(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])(file),
      fileValidationRules.allowedExtensions(['.pdf', '.jpg', '.jpeg', '.png'])(file),
    ].filter(Boolean);
    
    return errors.length > 0 ? errors[0] : null;
  },
};

// Form validation schemas
export const formValidationSchemas = {
  registration: {
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.password],
    confirmPassword: (formData: any) => [
      validationRules.required,
      validationRules.confirmPassword(formData.password)
    ],
    firstName: [validationRules.required, validationRules.name],
    lastName: [validationRules.required, validationRules.name],
    affiliation: [validationRules.required, validationRules.minLength(2)],
    country: [validationRules.required],
    participantType: [validationRules.required],
    selectedSessions: [validationRules.required, validationRules.arrayMinLength(1)],
    bio: [validationRules.maxLength(1000)],
    expertise: [validationRules.arrayMaxLength(10)],
  },

  submission: {
    title: [
      validationRules.required,
      validationRules.minLength(10),
      validationRules.maxLength(500)
    ],
    abstract: [
      validationRules.required,
      validationRules.minLength(100),
      validationRules.maxLength(5000),
      validationRules.minWords(50)
    ],
    keywords: [
      validationRules.required,
      validationRules.arrayMinLength(3),
      validationRules.arrayMaxLength(10)
    ],
    sessionType: [validationRules.required],
    presentationType: [validationRules.required],
    authors: [validationRules.required, validationRules.arrayMinLength(1)],
    correspondingAuthor: [validationRules.required, validationRules.email],
  },

  review: {
    score: [
      validationRules.required,
      validationRules.integer,
      validationRules.range(1, 10)
    ],
    comments: [
      validationRules.required,
      validationRules.minLength(50),
      validationRules.maxLength(2000)
    ],
    recommendation: [validationRules.required],
  },

  conference: {
    name: [
      validationRules.required,
      validationRules.minLength(5),
      validationRules.maxLength(255)
    ],
    startDate: [validationRules.required, validationRules.date, validationRules.futureDate],
    endDate: [validationRules.required, validationRules.date],
    venue: [validationRules.required, validationRules.minLength(5)],
    registrationDeadline: [validationRules.required, validationRules.date],
    submissionDeadline: [validationRules.required, validationRules.date],
  },
};

// Validation executor
export function validateField(value: any, rules: ((value: any) => string | null)[]): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  return null;
}

export function validateForm(formData: any, schema: any): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldRules = typeof rules === 'function' ? rules(formData) : rules as ((value: any) => string | null)[];
    const fieldValue = formData[fieldName];
    
    const error = validateField(fieldValue, fieldRules);
    if (error) {
      errors.push({
        field: fieldName,
        message: error,
        code: 'VALIDATION_ERROR'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Real-time validation hook for React components
export function useFieldValidation(value: any, rules: ((value: any) => string | null)[]) {
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (touched) {
      const validationError = validateField(value, rules);
      setError(validationError);
    }
  }, [value, rules, touched]);

  const markTouched = () => setTouched(true);
  const clearError = () => {
    setError(null);
    setTouched(false);
  };

  return {
    error,
    touched,
    markTouched,
    clearError,
    isValid: !error && touched
  };
}

// Input sanitization for client-side
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize unicode
    .normalize('NFC')
    // Trim whitespace
    .trim()
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// XSS prevention for display
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Markdown validation for abstracts
export function validateMarkdown(markdown: string): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for potentially dangerous markdown patterns
  const dangerousPatterns = [
    { pattern: /<script/gi, message: 'Script tags are not allowed' },
    { pattern: /javascript:/gi, message: 'JavaScript URLs are not allowed' },
    { pattern: /<iframe/gi, message: 'Iframe tags are not allowed' },
    { pattern: /<object/gi, message: 'Object tags are not allowed' },
    { pattern: /<embed/gi, message: 'Embed tags are not allowed' },
    { pattern: /on\w+\s*=/gi, message: 'Event handlers are not allowed' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(markdown)) {
      errors.push(message);
    }
  }

  // Check for markdown quality
  const lines = markdown.split('\n');
  const wordCount = markdown.split(/\s+/).length;

  if (wordCount < 50) {
    warnings.push('Abstract seems quite short. Consider adding more detail.');
  }

  if (wordCount > 500) {
    warnings.push('Abstract is quite long. Consider making it more concise.');
  }

  // Check for proper structure
  if (!markdown.includes('#') && !markdown.includes('**') && !markdown.includes('*')) {
    warnings.push('Consider using markdown formatting to improve readability.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Export React for the hook
import React from 'react';