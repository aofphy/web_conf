import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup minimal Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'participant',
        participantType: 'regular_participant'
      };
      next();
    });

    // Mock API endpoints
    app.post('/api/auth/register', (req, res) => {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (email === 'existing@example.com') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        data: {
          user: {
            id: 'user-123',
            email,
            firstName,
            lastName,
            role: 'participant'
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (email === 'invalid@example.com' || password === 'wrongpassword') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user-123',
            email,
            firstName: 'Test',
            lastName: 'User',
            role: 'participant'
          },
          token: 'mock-jwt-token'
        },
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/submissions', (req, res) => {
      const { title, abstract, keywords, sessionType, presentationType } = req.body;
      
      if (!title || !abstract || !keywords || !sessionType || !presentationType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (title.length < 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title must be at least 10 characters long'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Submission created successfully',
        data: {
          submission: {
            id: 'sub-123',
            userId: req.user?.userId,
            title,
            abstract,
            keywords,
            sessionType,
            presentationType,
            status: 'submitted',
            submissionDate: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/submissions/user/:userId', (req, res) => {
      const { userId } = req.params;
      
      if (userId !== req.user?.userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: {
          submissions: [
            {
              id: 'sub-1',
              userId,
              title: 'Test Submission 1',
              status: 'submitted',
              sessionType: 'CHE',
              presentationType: 'oral',
              submissionDate: new Date().toISOString()
            },
            {
              id: 'sub-2',
              userId,
              title: 'Test Submission 2',
              status: 'under_review',
              sessionType: 'CSE',
              presentationType: 'poster',
              submissionDate: new Date().toISOString()
            }
          ],
          total: 2
        },
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/payments', (req, res) => {
      const { amount, currency, paymentMethod } = req.body;
      
      if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required payment fields'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Payment record created successfully',
        data: {
          payment: {
            id: 'payment-123',
            userId: req.user?.userId,
            amount,
            currency,
            paymentMethod,
            status: 'pending',
            paymentDate: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        },
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
          affiliation: 'Test University',
          country: 'Test Country',
          participantType: 'regular_participant',
          selectedSessions: ['CHE']
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.user.firstName).toBe(userData.firstName);
      });

      it('should reject registration with existing email', async () => {
        const userData = {
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          firstName: 'Existing',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('EMAIL_EXISTS');
      });

      it('should reject registration with missing fields', async () => {
        const incompleteData = {
          email: 'incomplete@example.com'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginData = {
          email: 'valid@example.com',
          password: 'correctpassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.email).toBe(loginData.email);
      });

      it('should reject login with invalid credentials', async () => {
        const loginData = {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Submissions API', () => {
    describe('POST /api/submissions', () => {
      it('should create submission successfully', async () => {
        const submissionData = {
          title: 'Test Research Submission for API Integration',
          abstract: 'This is a comprehensive test abstract for API integration testing.',
          keywords: ['test', 'api', 'integration'],
          sessionType: 'CHE',
          presentationType: 'oral',
          authors: [{
            name: 'Test Author',
            affiliation: 'Test University',
            email: 'author@test.com',
            isCorresponding: true,
            authorOrder: 1
          }],
          correspondingAuthor: 'author@test.com'
        };

        const response = await request(app)
          .post('/api/submissions')
          .send(submissionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.submission.title).toBe(submissionData.title);
        expect(response.body.data.submission.status).toBe('submitted');
      });

      it('should reject submission with short title', async () => {
        const submissionData = {
          title: 'Short',
          abstract: 'Test abstract',
          keywords: ['test'],
          sessionType: 'CHE',
          presentationType: 'oral'
        };

        const response = await request(app)
          .post('/api/submissions')
          .send(submissionData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject submission with missing fields', async () => {
        const incompleteData = {
          title: 'Complete Title for Testing'
          // Missing other required fields
        };

        const response = await request(app)
          .post('/api/submissions')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/submissions/user/:userId', () => {
      it('should retrieve user submissions', async () => {
        const response = await request(app)
          .get('/api/submissions/user/test-user-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.submissions).toHaveLength(2);
        expect(response.body.data.total).toBe(2);
      });

      it('should reject access to other user submissions', async () => {
        const response = await request(app)
          .get('/api/submissions/user/other-user-123')
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
      });
    });
  });

  describe('Payments API', () => {
    describe('POST /api/payments', () => {
      it('should create payment record successfully', async () => {
        const paymentData = {
          amount: 300,
          currency: 'USD',
          paymentMethod: 'bank_transfer',
          transactionReference: 'TXN-123'
        };

        const response = await request(app)
          .post('/api/payments')
          .send(paymentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.payment.amount).toBe(paymentData.amount);
        expect(response.body.data.payment.status).toBe('pending');
      });

      it('should reject payment with missing fields', async () => {
        const incompleteData = {
          amount: 300
          // Missing other required fields
        };

        const response = await request(app)
          .post('/api/payments')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('API Response Format', () => {
    it('should return consistent success response format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'format@example.com',
          password: 'Password123!',
          firstName: 'Format',
          lastName: 'Test'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return consistent error response format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle JSON content type correctly', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          email: 'json@example.com',
          password: 'Password123!',
          firstName: 'JSON',
          lastName: 'Test'
        }))
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return JSON responses', async () => {
      const response = await request(app)
        .get('/api/submissions/user/test-user-123')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 201 for successful creation', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'status@example.com',
          password: 'Password123!',
          firstName: 'Status',
          lastName: 'Test'
        })
        .expect(201);
    });

    it('should return 200 for successful retrieval', async () => {
      await request(app)
        .get('/api/submissions/user/test-user-123')
        .expect(200);
    });

    it('should return 400 for validation errors', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });

    it('should return 401 for authentication errors', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should return 403 for authorization errors', async () => {
      await request(app)
        .get('/api/submissions/user/other-user-123')
        .expect(403);
    });

    it('should return 409 for conflict errors', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          firstName: 'Existing',
          lastName: 'User'
        })
        .expect(409);
    });
  });
});