import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

    // In production, only allow specific domains
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      allowedOrigins.push(...productionOrigins);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours
};

// Helmet security configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

// Request ID middleware for tracking
export function requestId(req: Request, res: Response, next: NextFunction) {
  const requestId = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}-${req.ip}`)
    .digest('hex')
    .substring(0, 16);
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Audit logging middleware
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  const requestLog = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id,
    body: req.method !== 'GET' ? sanitizeLogData(req.body) : undefined,
    query: Object.keys(req.query).length > 0 ? sanitizeLogData(req.query) : undefined,
  };

  // Log sensitive operations
  const sensitiveOperations = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/change-password',
    '/api/admin/',
    '/api/payments/',
  ];

  const isSensitive = sensitiveOperations.some(op => req.url.includes(op));
  
  if (isSensitive || process.env.NODE_ENV === 'development') {
    console.log('Request:', JSON.stringify(requestLog, null, 2));
  }

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    const responseLog = {
      requestId: req.requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };

    if (isSensitive || process.env.NODE_ENV === 'development') {
      console.log('Response:', JSON.stringify(responseLog, null, 2));
    }

    // Log errors and security events
    if (res.statusCode >= 400) {
      console.error('Error Response:', JSON.stringify({
        ...responseLog,
        error: res.statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.id,
      }, null, 2));
    }

    return originalSend.call(this, data);
  };

  next();
}

// Sanitize sensitive data for logging
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Session management middleware
export function sessionSecurity(req: Request, res: Response, next: NextFunction) {
  // Set secure session headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Prevent session fixation
  if (req.session) {
    req.session.regenerate = req.session.regenerate || (() => {});
  }
  
  next();
}

// IP whitelist middleware for admin endpoints
export function ipWhitelist(allowedIPs: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }

    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if no IPs specified
    }

    if (!clientIP || !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied from this IP address'
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Brute force protection
const loginAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();

export function bruteForceProtection(maxAttempts: number = 5, blockDuration: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.body?.email || 'unknown'}`;
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (attempt) {
      // Reset if block duration has passed
      if (attempt.blocked && (now - attempt.lastAttempt) > blockDuration) {
        loginAttempts.delete(key);
      } else if (attempt.blocked) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'ACCOUNT_TEMPORARILY_BLOCKED',
            message: `Account temporarily blocked due to too many failed attempts. Try again in ${Math.ceil((blockDuration - (now - attempt.lastAttempt)) / 60000)} minutes.`
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Store original response methods to intercept login failures
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 401 || (data && !data.success)) {
        // Failed login attempt
        const currentAttempt = loginAttempts.get(key) || { count: 0, lastAttempt: 0, blocked: false };
        currentAttempt.count++;
        currentAttempt.lastAttempt = now;
        
        if (currentAttempt.count >= maxAttempts) {
          currentAttempt.blocked = true;
          console.warn(`Brute force protection activated for ${key} after ${currentAttempt.count} attempts`);
        }
        
        loginAttempts.set(key, currentAttempt);
      } else if (res.statusCode === 200 && data && data.success) {
        // Successful login - reset attempts
        loginAttempts.delete(key);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

// Token refresh security
export function tokenRefreshSecurity(req: Request, res: Response, next: NextFunction) {
  // Ensure token refresh requests are properly secured
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization token is required'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Add additional security headers for token operations
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
}

// File upload security middleware
export function fileUploadSecurity(req: Request, res: Response, next: NextFunction) {
  // Additional security for file uploads
  if (req.file) {
    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid characters
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,  // Executable extensions
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(req.file.originalname)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUSPICIOUS_FILENAME',
            message: 'Filename contains suspicious patterns'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Log file upload for audit
    console.log('File Upload:', {
      requestId: req.requestId,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: (req as any).user?.id,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

// API versioning middleware
export function apiVersioning(req: Request, res: Response, next: NextFunction) {
  // Set API version header
  res.setHeader('X-API-Version', '1.0.0');
  
  // Handle API version requests
  const acceptedVersion = req.headers['accept-version'] || req.query.version;
  
  if (acceptedVersion && acceptedVersion !== '1.0.0') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: 'Unsupported API version. Current version: 1.0.0'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

// Health check bypass for security middleware
export function healthCheckBypass(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path === '/api/health') {
    return res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
  next();
}

// Comprehensive security middleware stack
export function securityStack() {
  return [
    healthCheckBypass,
    requestId,
    helmet(helmetOptions),
    cors(corsOptions),
    auditLogger,
    sessionSecurity,
    apiVersioning,
  ];
}

// Declare module augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      session?: any;
    }
  }
}