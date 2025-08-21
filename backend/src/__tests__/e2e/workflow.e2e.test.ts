import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('End-to-End Workflow Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup minimal Express app for E2E testing
    app = express();
    app.use(express.json());
    
    // Mock user state
    let users: any[] = [];
    let submissions: any[] = [];
    let payments: any[] = [];
    let currentUser: any = null;

    // Authentication middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === 'valid-token') {
          req.user = currentUser;
        }
      }
      next();
    });

    // Registration endpoint
    app.post('/api/auth/register', (req, res) => {
      const { email, password, firstName, lastName, participantType } = req.body;
      
      if (users.find(u => u.email === email)) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already exists' }
        });
      }

      const user = {
        id: `user-${users.length + 1}`,
        email,
        firstName,
        lastName,
        participantType,
        role: participantType === 'oral_presenter' ? 'presenter' : 'participant',
        registrationDate: new Date().toISOString(),
        emailVerified: false
      };

      users.push(user);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user }
      });
    });

    // Login endpoint
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      const user = users.find(u => u.email === email);
      
      if (!user || !user.emailVerified) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials or email not verified' }
        });
      }

      currentUser = user;
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token: 'valid-token' }
      });
    });

    // Email verification endpoint
    app.post('/api/auth/verify-email', (req, res) => {
      const { email, token } = req.body;
      const user = users.find(u => u.email === email);
      
      if (user && token === 'valid-verification-token') {
        user.emailVerified = true;
        res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid verification token' }
        });
      }
    });

    // Submission endpoint
    app.post('/api/submissions', (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { title, abstract, keywords, sessionType, presentationType } = req.body;
      
      const submission = {
        id: `sub-${submissions.length + 1}`,
        userId: req.user.id,
        title,
        abstract,
        keywords,
        sessionType,
        presentationType,
        status: 'submitted',
        submissionDate: new Date().toISOString()
      };

      submissions.push(submission);
      
      res.status(201).json({
        success: true,
        message: 'Submission created successfully',
        data: { submission }
      });
    });

    // Get user submissions
    app.get('/api/submissions/user/:userId', (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const userSubmissions = submissions.filter(s => s.userId === req.params.userId);
      
      res.status(200).json({
        success: true,
        data: { submissions: userSubmissions, total: userSubmissions.length }
      });
    });

    // Payment endpoint
    app.post('/api/payments', (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { amount, currency, paymentMethod } = req.body;
      
      const payment = {
        id: `payment-${payments.length + 1}`,
        userId: req.user.id,
        amount,
        currency,
        paymentMethod,
        status: 'pending',
        paymentDate: new Date().toISOString()
      };

      payments.push(payment);
      
      res.status(201).json({
        success: true,
        message: 'Payment record created',
        data: { payment }
      });
    });

    // Submit payment proof
    app.put('/api/payments/:id/submit-proof', (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const payment = payments.find(p => p.id === req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
        });
      }

      payment.status = 'payment_submitted';
      payment.proofSubmittedAt = new Date().toISOString();
      
      res.status(200).json({
        success: true,
        message: 'Payment proof submitted',
        data: { payment }
      });
    });
  });

  describe('Complete User Registration and Submission Workflow', () => {
    it('should complete full user journey from registration to submission', async () => {
      // Step 1: User Registration
      const registrationData = {
        email: 'researcher@university.edu',
        password: 'SecurePassword123!',
        firstName: 'Dr. Jane',
        lastName: 'Researcher',
        affiliation: 'University of Science',
        country: 'United States',
        participantType: 'oral_presenter',
        selectedSessions: ['CHE', 'CSE']
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(registrationData.email);
      expect(registerResponse.body.data.user.emailVerified).toBe(false);

      // Step 2: Attempt login before email verification (should fail)
      const loginBeforeVerification = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(401);

      expect(loginBeforeVerification.body.success).toBe(false);

      // Step 3: Email Verification
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: registrationData.email,
          token: 'valid-verification-token'
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Step 4: Login after email verification
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBe('valid-token');

      const token = loginResponse.body.data.token;
      const userId = loginResponse.body.data.user.id;

      // Step 5: Create Abstract Submission
      const submissionData = {
        title: 'Machine Learning Applications in Computational Chemistry',
        abstract: 'This research presents a novel approach to computational chemistry using machine learning.',
        keywords: ['machine learning', 'computational chemistry', 'research'],
        sessionType: 'CHE',
        presentationType: 'oral',
        authors: [{
          name: 'Dr. Jane Researcher',
          affiliation: 'University of Science',
          email: 'researcher@university.edu',
          isCorresponding: true,
          authorOrder: 1
        }],
        correspondingAuthor: 'researcher@university.edu'
      };

      const submissionResponse = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send(submissionData)
        .expect(201);

      expect(submissionResponse.body.success).toBe(true);
      expect(submissionResponse.body.data.submission.title).toBe(submissionData.title);
      expect(submissionResponse.body.data.submission.status).toBe('submitted');

      // Step 6: View User Submissions
      const userSubmissionsResponse = await request(app)
        .get(`/api/submissions/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(userSubmissionsResponse.body.success).toBe(true);
      expect(userSubmissionsResponse.body.data.submissions).toHaveLength(1);
      expect(userSubmissionsResponse.body.data.submissions[0].title).toBe(submissionData.title);

      // Step 7: Create Payment Record
      const paymentData = {
        amount: 300,
        currency: 'USD',
        paymentMethod: 'bank_transfer',
        transactionReference: 'TXN-2024-001'
      };

      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(paymentData)
        .expect(201);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.payment.amount).toBe(paymentData.amount);
      expect(paymentResponse.body.data.payment.status).toBe('pending');

      // Step 8: Submit Payment Proof
      const paymentId = paymentResponse.body.data.payment.id;
      const proofResponse = await request(app)
        .put(`/api/payments/${paymentId}/submit-proof`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          proofOfPaymentPath: 'uploads/payment_proofs/receipt.jpg',
          notes: 'Bank transfer receipt'
        })
        .expect(200);

      expect(proofResponse.body.success).toBe(true);
      expect(proofResponse.body.data.payment.status).toBe('payment_submitted');

      // Verify complete workflow
      expect(registerResponse.body.success).toBe(true);
      expect(verifyResponse.body.success).toBe(true);
      expect(loginResponse.body.success).toBe(true);
      expect(submissionResponse.body.success).toBe(true);
      expect(userSubmissionsResponse.body.success).toBe(true);
      expect(paymentResponse.body.success).toBe(true);
      expect(proofResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle duplicate registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        firstName: 'Duplicate',
        lastName: 'User',
        participantType: 'regular_participant'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should require authentication for protected endpoints', async () => {
      const submissionData = {
        title: 'Unauthorized Submission',
        abstract: 'This should fail without authentication',
        keywords: ['test'],
        sessionType: 'CHE',
        presentationType: 'oral'
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(submissionData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: 'test@example.com',
          token: 'invalid-token'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Multi-User Workflow', () => {
    it('should handle multiple users independently', async () => {
      const users = [
        {
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          participantType: 'oral_presenter'
        },
        {
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          participantType: 'poster_presenter'
        }
      ];

      const baseData = {
        password: 'Password123!',
        affiliation: 'Test University',
        country: 'Test Country',
        selectedSessions: ['CHE']
      };

      // Register both users
      const registrationPromises = users.map(user =>
        request(app)
          .post('/api/auth/register')
          .send({ ...baseData, ...user })
      );

      const registrationResponses = await Promise.all(registrationPromises);

      registrationResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(users[index].email);
      });

      // Verify both users' emails
      const verificationPromises = users.map(user =>
        request(app)
          .post('/api/auth/verify-email')
          .send({
            email: user.email,
            token: 'valid-verification-token'
          })
      );

      const verificationResponses = await Promise.all(verificationPromises);
      verificationResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Login both users and create submissions
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: baseData.password
          })
          .expect(200);

        const token = loginResponse.body.data.token;

        const submissionResponse = await request(app)
          .post('/api/submissions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Research by ${user.firstName} ${user.lastName}`,
            abstract: `Research abstract by ${user.firstName}`,
            keywords: ['research', 'test'],
            sessionType: 'CHE',
            presentationType: user.participantType === 'oral_presenter' ? 'oral' : 'poster'
          })
          .expect(201);

        expect(submissionResponse.body.success).toBe(true);
        expect(submissionResponse.body.data.submission.title).toContain(user.firstName);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentUsers = 5;
      const startTime = Date.now();

      const registrationPromises = Array.from({ length: concurrentUsers }, (_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent${index}@example.com`,
            password: 'Password123!',
            firstName: `User${index}`,
            lastName: 'Concurrent',
            participantType: 'regular_participant',
            affiliation: 'Test University',
            country: 'Test Country',
            selectedSessions: ['CHE']
          })
      );

      const responses = await Promise.all(registrationPromises);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(`concurrent${index}@example.com`);
      });

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000);
    });
  });
});