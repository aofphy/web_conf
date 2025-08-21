import express from 'express'
import dotenv from 'dotenv'

// Import security middleware
import { 
  securityStack, 
  bruteForceProtection, 
  tokenRefreshSecurity,
  fileUploadSecurity 
} from './middleware/security.js'
import { rateLimitConfigs } from './middleware/validation.js'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import conferenceRoutes from './routes/conference.js'
import sessionRoutes from './routes/sessions.js'
import submissionRoutes from './routes/submissions.js'
import reviewRoutes from './routes/reviews.js'
import paymentRoutes from './routes/payments.js'
import abstractBookRoutes from './routes/abstractBook.js'
import adminRoutes from './routes/admin.js'

// Import services
import { DeadlineReminderService } from './services/DeadlineReminderService.js'
import { auditService } from './services/AuditService.js'
import { CacheService } from './services/CacheService.js'
import { PerformanceService } from './services/PerformanceService.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1)

// Apply comprehensive security middleware stack
app.use(securityStack())

// Performance monitoring
const performanceService = PerformanceService.getInstance();
app.use(performanceService.trackRequest());

// Global rate limiting
app.use(rateLimitConfigs.general)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (_req, res) => {
  const systemHealth = performanceService.getSystemHealth();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'International Conference API',
    uptime: systemHealth.uptime,
    memory: {
      used: Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024),
      free: Math.round(systemHealth.freeMemory / 1024 / 1024),
    }
  })
})

// Performance metrics endpoint (admin only)
app.get('/metrics', (_req, res) => {
  const stats = performanceService.getStatistics();
  res.json({
    timestamp: new Date().toISOString(),
    performance: stats,
    system: performanceService.getSystemHealth()
  });
})

// Prometheus metrics endpoint
app.get('/metrics/prometheus', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(performanceService.exportMetrics('prometheus'));
})

// API routes with specific security middleware
app.use('/api/auth', bruteForceProtection(), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conference', conferenceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/submissions', fileUploadSecurity, submissionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', fileUploadSecurity, paymentRoutes);
app.use('/api/abstract-book', abstractBookRoutes);
app.use('/api/admin', rateLimitConfigs.admin, adminRoutes);

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({ 
    message: 'International Conference API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      conference: '/api/conference',
      sessions: '/api/sessions',
      submissions: '/api/submissions',
      reviews: '/api/reviews',
      payments: '/api/payments',
      abstractBook: '/api/abstract-book',
      admin: '/api/admin',
      api: '/api'
    }
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log error to audit service
  auditService.logSystemError(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  }, req.requestId);

  console.error('Server Error:', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'Something went wrong!',
      ...(isDevelopment && { stack: err.stack }),
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`)
  
  // Initialize cache service
  const cacheService = CacheService.getInstance();
  try {
    await cacheService.connect();
    console.log('💾 Cache service initialized')
  } catch (error) {
    console.warn('⚠️  Cache service unavailable, continuing without cache:', error);
  }
  
  // Initialize deadline reminder service
  const deadlineReminderService = new DeadlineReminderService();
  
  // Run deadline checks every 6 hours (21600000 ms)
  setInterval(async () => {
    try {
      await deadlineReminderService.runAllReminderChecks();
    } catch (error) {
      console.error('Error running deadline reminder checks:', error);
    }
  }, 6 * 60 * 60 * 1000);
  
  // Run initial check after 1 minute
  setTimeout(async () => {
    try {
      await deadlineReminderService.runAllReminderChecks();
    } catch (error) {
      console.error('Error running initial deadline reminder check:', error);
    }
  }, 60000);
  
  console.log('📧 Email notification system initialized')
  console.log('⏰ Deadline reminder scheduler started')
})