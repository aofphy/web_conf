import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import { fileValidation } from '../models/validation.js';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

// Generic validation middleware factory
export function validateRequest(schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[target];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors
        },
        timestamp: new Date().toISOString()
      });
    }

    // Replace the original data with sanitized/converted data
    req[target] = value;
    next();
  };
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Recursively sanitize strings in request body
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
}

// String sanitization function
function sanitizeString(input: string): string {
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

// File upload validation middleware
export function validateFileUpload(fileType: 'manuscript' | 'paymentProof') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded'
        },
        timestamp: new Date().toISOString()
      });
    }

    const config = fileValidation[fileType];
    const file = req.file;

    // Validate file size
    if (file.size > config.maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate MIME type
    if (!config.allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Additional security checks
    const securityCheck = performFileSecurityChecks(file);
    if (!securityCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_SECURITY_VIOLATION',
          message: securityCheck.message
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// File security checks
function performFileSecurityChecks(file: Express.Multer.File): { isValid: boolean; message?: string } {
  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,  // Executable extensions
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Reserved Windows names
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.originalname)) {
      return {
        isValid: false,
        message: 'Filename contains suspicious patterns'
      };
    }
  }

  // Check for null bytes in filename
  if (file.originalname.includes('\0')) {
    return {
      isValid: false,
      message: 'Filename contains null bytes'
    };
  }

  // Check filename length
  if (file.originalname.length > 255) {
    return {
      isValid: false,
      message: 'Filename is too long'
    };
  }

  return { isValid: true };
}

// Rate limiting configurations
export const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Authentication endpoints (more restrictive)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // File upload endpoints
  fileUpload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 file uploads per hour
    message: {
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Submission endpoints
  submission: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 submissions per hour
    message: {
      success: false,
      error: {
        code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
        message: 'Too many submissions, please try again later'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Admin endpoints (more lenient for legitimate admin use)
  admin: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Higher limit for admin operations
    message: {
      success: false,
      error: {
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        message: 'Too many admin requests, please try again later'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Request size limiting middleware
export function limitRequestSize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

// Content-Type validation middleware
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('content-type');
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const baseContentType = contentType.split(';')[0].trim();
    
    if (!allowedTypes.includes(baseContentType)) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

// SQL injection prevention middleware (additional layer)
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/))/gi,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))((\%75)|u|(\%55))((\%6E)|n|(\%4E))((\%69)|i|(\%49))((\%6F)|o|(\%4F))((\%6E)|n|(\%4E))/gi,
  ];

  function checkForSQLInjection(obj: any, path: string = ''): string | null {
    if (typeof obj === 'string') {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(obj)) {
          return path || 'request';
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForSQLInjection(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const result = checkForSQLInjection(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  // Check body, query, and params
  const suspiciousField = 
    checkForSQLInjection(req.body, 'body') ||
    checkForSQLInjection(req.query, 'query') ||
    checkForSQLInjection(req.params, 'params');

  if (suspiciousField) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SUSPICIOUS_INPUT_DETECTED',
        message: 'Potentially malicious input detected',
        details: { field: suspiciousField }
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
}

// XSS prevention middleware
export function preventXSS(req: Request, res: Response, next: NextFunction) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
  ];

  function checkForXSS(obj: any, path: string = ''): string | null {
    if (typeof obj === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          return path || 'request';
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForXSS(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const result = checkForXSS(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  const suspiciousField = 
    checkForXSS(req.body, 'body') ||
    checkForXSS(req.query, 'query') ||
    checkForXSS(req.params, 'params');

  if (suspiciousField) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'XSS_ATTEMPT_DETECTED',
        message: 'Potentially malicious script detected',
        details: { field: suspiciousField }
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
}

// Comprehensive security middleware stack
export function securityMiddleware() {
  return [
    sanitizeInput,
    preventSQLInjection,
    preventXSS,
  ];
}

// Validation schemas for common request patterns
export const commonValidationSchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  uuid: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  search: Joi.object({
    query: Joi.string().min(1).max(255).required(),
    filters: Joi.object().optional(),
  }),
};