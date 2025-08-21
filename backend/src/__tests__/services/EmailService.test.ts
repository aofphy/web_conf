import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EmailService } from '../../services/EmailService';
import { User } from '../../types/index';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn()
}));
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    isOpen: false,
    zAdd: jest.fn().mockResolvedValue(1),
    zPopMax: jest.fn().mockResolvedValue([]),
    zCard: jest.fn().mockResolvedValue(0)
  }))
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;
  let mockUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };

    mockedNodemailer.createTransporter.mockReturnValue(mockTransporter);

    // Create EmailService instance
    emailService = new EmailService();

    // Mock user data
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      affiliation: 'Test University',
      country: 'Test Country',
      participantType: 'regular_participant',
      role: 'participant',
      registrationDate: new Date('2024-01-01'),
      selectedSessions: ['CHE', 'CSE'],
      isActive: true,
      paymentStatus: 'not_paid',
      registrationFee: 300,
      password: 'hashedpassword'
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      const verificationToken = 'test-verification-token';
      
      const jobId = await emailService.sendVerificationEmail(mockUser, verificationToken);

      expect(jobId).toBeTruthy();
      expect(typeof jobId).toBe('string');
      
      // Since Redis is mocked as not connected, it should send immediately
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: mockUser.email,
          subject: expect.stringContaining('Verify Your Email'),
          html: expect.stringContaining(mockUser.firstName),
          text: expect.stringContaining(mockUser.firstName)
        })
      );
    });

    it('should include verification URL in email content', async () => {
      const verificationToken = 'test-verification-token';
      
      await emailService.sendVerificationEmail(mockUser, verificationToken);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain(verificationToken);
      expect(sendMailCall.html).toContain(encodeURIComponent(mockUser.email));
      expect(sendMailCall.text).toContain(verificationToken);
    });
  });

  describe('sendRegistrationConfirmation', () => {
    it('should send registration confirmation email', async () => {
      const jobId = await emailService.sendRegistrationConfirmation(mockUser);

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Registration Confirmed'),
          html: expect.stringContaining(mockUser.firstName),
          text: expect.stringContaining(mockUser.firstName)
        })
      );
    });

    it('should include registration details in email', async () => {
      await emailService.sendRegistrationConfirmation(mockUser);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain(mockUser.participantType.replace(/_/g, ' '));
      expect(sendMailCall.html).toContain(mockUser.registrationFee.toString());
      expect(sendMailCall.text).toContain(mockUser.participantType.replace(/_/g, ' '));
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with conference information', async () => {
      const jobId = await emailService.sendWelcomeEmail(mockUser);

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining('CHE'),
          text: expect.stringContaining('CHE')
        })
      );
    });

    it('should include session information in welcome email', async () => {
      await emailService.sendWelcomeEmail(mockUser);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('Computational Chemistry');
      expect(sendMailCall.html).toContain('Computer Science');
      expect(sendMailCall.text).toContain('Computational Chemistry');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with reset token', async () => {
      const resetToken = 'test-reset-token';
      
      const jobId = await emailService.sendPasswordResetEmail(mockUser, resetToken);

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining(resetToken),
          text: expect.stringContaining(resetToken)
        })
      );
    });

    it('should include security warnings in password reset email', async () => {
      const resetToken = 'test-reset-token';
      
      await emailService.sendPasswordResetEmail(mockUser, resetToken);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('expire in 1 hour');
      expect(sendMailCall.html).toContain('Security Notice');
      expect(sendMailCall.text).toContain('expire in 1 hour');
    });
  });

  describe('sendSubmissionConfirmation', () => {
    it('should send submission confirmation email', async () => {
      const submission = {
        id: 'sub-123',
        title: 'Test Submission',
        sessionType: 'CHE',
        presentationType: 'oral',
        status: 'submitted',
        submissionDate: new Date('2024-01-15')
      };

      const jobId = await emailService.sendSubmissionConfirmation(
        mockUser.email,
        `${mockUser.firstName} ${mockUser.lastName}`,
        submission
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining(submission.title),
          html: expect.stringContaining(submission.id),
          text: expect.stringContaining(submission.id)
        })
      );
    });
  });

  describe('sendSubmissionStatusUpdate', () => {
    it('should send status update email with new status', async () => {
      const submission = {
        id: 'sub-123',
        title: 'Test Submission'
      };
      const newStatus = 'accepted';
      const adminNotes = 'Great work!';

      const jobId = await emailService.sendSubmissionStatusUpdate(
        mockUser.email,
        mockUser.firstName,
        submission,
        newStatus,
        adminNotes
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Status Update'),
          html: expect.stringContaining(newStatus),
          text: expect.stringContaining(newStatus)
        })
      );
    });
  });

  describe('sendPaymentVerificationEmail', () => {
    it('should send payment verification email', async () => {
      const paymentRecord = {
        id: 'pay-123',
        amount: 300,
        currency: 'USD',
        status: 'verified'
      };

      const jobId = await emailService.sendPaymentVerificationEmail(
        mockUser.email,
        mockUser.firstName,
        paymentRecord
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Payment'),
          html: expect.stringContaining('verified'),
          text: expect.stringContaining('verified')
        })
      );
    });
  });

  describe('sendPaymentRejectionEmail', () => {
    it('should send payment rejection email with reason', async () => {
      const paymentRecord = {
        id: 'pay-123',
        amount: 300,
        currency: 'USD',
        status: 'rejected'
      };
      const rejectionReason = 'Invalid transaction reference';

      const jobId = await emailService.sendPaymentRejectionEmail(
        mockUser.email,
        mockUser.firstName,
        paymentRecord,
        rejectionReason
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Payment'),
          html: expect.stringContaining(rejectionReason),
          text: expect.stringContaining(rejectionReason)
        })
      );
    });
  });

  describe('sendReviewAssignmentEmail', () => {
    it('should send review assignment email to reviewer', async () => {
      const submission = {
        id: 'sub-123',
        title: 'Test Submission'
      };
      const deadline = new Date('2024-02-15');

      const jobId = await emailService.sendReviewAssignmentEmail(
        'reviewer@example.com',
        'Dr. Reviewer',
        submission,
        deadline
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'reviewer@example.com',
          subject: expect.stringContaining('Review Assignment'),
          html: expect.stringContaining(submission.title),
          text: expect.stringContaining(submission.title)
        })
      );
    });
  });

  describe('sendReviewReminderEmail', () => {
    it('should send review reminder email with days remaining', async () => {
      const submission = {
        id: 'sub-123',
        title: 'Test Submission'
      };
      const deadline = new Date('2024-02-15');
      const daysRemaining = 3;

      const jobId = await emailService.sendReviewReminderEmail(
        'reviewer@example.com',
        'Dr. Reviewer',
        submission,
        deadline,
        daysRemaining
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'reviewer@example.com',
          subject: expect.stringContaining('Reminder'),
          html: expect.stringContaining(daysRemaining.toString()),
          text: expect.stringContaining(daysRemaining.toString())
        })
      );
    });
  });

  describe('sendDeadlineReminderEmail', () => {
    it('should send deadline reminder email', async () => {
      const deadlineType = 'submission';
      const deadline = new Date('2024-02-15');
      const daysRemaining = 5;

      const jobId = await emailService.sendDeadlineReminderEmail(
        mockUser.email,
        mockUser.firstName,
        deadlineType,
        deadline,
        daysRemaining
      );

      expect(jobId).toBeTruthy();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('Deadline'),
          html: expect.stringContaining(deadlineType),
          text: expect.stringContaining(deadlineType)
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await emailService.getQueueStats();

      expect(stats).toEqual({
        pending: 0,
        processing: expect.any(Boolean)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle email sending errors gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        emailService.sendVerificationEmail(mockUser, 'test-token')
      ).rejects.toThrow('Failed to queue email for delivery');
    });

    it('should handle missing environment variables', () => {
      // Test that EmailService can be instantiated even with missing env vars
      expect(() => new EmailService()).not.toThrow();
    });
  });

  describe('Email Templates', () => {
    it('should generate HTML and text versions for all email types', async () => {
      const verificationToken = 'test-token';
      
      await emailService.sendVerificationEmail(mockUser, verificationToken);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toBeTruthy();
      expect(sendMailCall.text).toBeTruthy();
      expect(sendMailCall.html).toContain('<!DOCTYPE html>');
      expect(sendMailCall.text).not.toContain('<');
    });

    it('should include user information in all templates', async () => {
      await emailService.sendRegistrationConfirmation(mockUser);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain(mockUser.firstName);
      expect(sendMailCall.html).toContain(mockUser.lastName);
      expect(sendMailCall.text).toContain(mockUser.firstName);
    });

    it('should format participant types correctly in templates', async () => {
      const userWithUnderscores = {
        ...mockUser,
        participantType: 'oral_presenter' as any
      };

      await emailService.sendRegistrationConfirmation(userWithUnderscores);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('oral presenter');
      expect(sendMailCall.text).toContain('oral presenter');
    });
  });
});