import nodemailer from 'nodemailer';
import { createClient } from 'redis';
import { User } from '../types/index.js';
import { emailTemplates, emailConfig } from '../templates/emailTemplates.js';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailJob {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  type: EmailType;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  data?: any;
}

export type EmailType = 
  | 'registration_confirmation'
  | 'email_verification'
  | 'welcome'
  | 'password_reset'
  | 'submission_confirmation'
  | 'submission_status_update'
  | 'manuscript_upload_confirmation'
  | 'payment_verification'
  | 'payment_rejection'
  | 'review_assignment'
  | 'review_reminder'
  | 'deadline_reminder';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private baseUrl: string;
  private redisClient: any;
  private isProcessing: boolean = false;
  private queueName: string = 'email_queue';

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@conference.org';
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Configure email transporter with enhanced SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      // Enhanced configuration for reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });

    // Initialize Redis client for email queue
    this.initializeRedis();
    
    // Start processing email queue
    this.startQueueProcessor();
  }

  /**
   * Initialize Redis client for email queue
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('Redis client connected for email queue');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis for email queue:', error);
      // Continue without Redis if connection fails
    }
  }

  /**
   * Add email to queue for reliable delivery
   */
  async queueEmail(emailJob: Omit<EmailJob, 'id' | 'attempts' | 'createdAt'>): Promise<string> {
    const job: EmailJob = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      attempts: 0,
      createdAt: new Date(),
      ...emailJob
    };

    try {
      if (this.redisClient && this.redisClient.isOpen) {
        // Add to Redis queue with priority scoring
        const score = job.priority || 0;
        await this.redisClient.zAdd(this.queueName, {
          score,
          value: JSON.stringify(job)
        });
        
        console.log(`Email job ${job.id} queued with priority ${score}`);
        return job.id;
      } else {
        // Fallback: send immediately if Redis is not available
        console.warn('Redis not available, sending email immediately');
        await this.sendEmailDirect({
          to: job.to,
          subject: job.subject,
          html: job.html,
          text: job.text
        });
        return job.id;
      }
    } catch (error) {
      console.error('Failed to queue email:', error);
      throw new Error('Failed to queue email for delivery');
    }
  }

  /**
   * Start processing email queue
   */
  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Process queue every 5 seconds
    setInterval(async () => {
      await this.processEmailQueue();
    }, 5000);

    console.log('Email queue processor started');
  }

  /**
   * Process emails from the queue
   */
  private async processEmailQueue(): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      return;
    }

    try {
      // Get highest priority email from queue
      const jobs = await this.redisClient.zPopMax(this.queueName, 1);
      
      if (jobs.length === 0) {
        return; // No jobs in queue
      }

      const jobData = JSON.parse(jobs[0].value);
      const job: EmailJob = {
        ...jobData,
        createdAt: new Date(jobData.createdAt),
        scheduledAt: jobData.scheduledAt ? new Date(jobData.scheduledAt) : undefined
      };

      // Check if email should be sent now
      if (job.scheduledAt && job.scheduledAt > new Date()) {
        // Re-queue for later
        await this.redisClient.zAdd(this.queueName, {
          score: job.priority || 0,
          value: JSON.stringify(job)
        });
        return;
      }

      try {
        await this.sendEmailDirect({
          to: job.to,
          subject: job.subject,
          html: job.html,
          text: job.text
        });
        
        console.log(`Email job ${job.id} processed successfully`);
      } catch (error) {
        console.error(`Failed to send email job ${job.id}:`, error);
        
        // Retry logic
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          // Re-queue with lower priority for retry
          const retryJob = {
            ...job,
            priority: (job.priority || 0) - 1,
            scheduledAt: new Date(Date.now() + (job.attempts * 60000)) // Exponential backoff
          };
          
          await this.redisClient.zAdd(this.queueName, {
            score: retryJob.priority,
            value: JSON.stringify(retryJob)
          });
          
          console.log(`Email job ${job.id} requeued for retry (attempt ${job.attempts}/${job.maxAttempts})`);
        } else {
          console.error(`Email job ${job.id} failed after ${job.maxAttempts} attempts`);
          // Could add to dead letter queue here
        }
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{ pending: number; processing: boolean }> {
    try {
      if (!this.redisClient || !this.redisClient.isOpen) {
        return { pending: 0, processing: false };
      }

      const pending = await this.redisClient.zCard(this.queueName);
      return {
        pending,
        processing: this.isProcessing
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pending: 0, processing: false };
    }
  }

  /**
   * Send email verification to new user
   */
  async sendVerificationEmail(user: User, verificationToken: string): Promise<string> {
    const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    
    const template = this.getVerificationEmailTemplate(user, verificationUrl);
    
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'email_verification',
      priority: 10, // High priority for verification emails
      data: { userId: user.id, verificationToken }
    });
  }

  /**
   * Send registration confirmation email
   */
  async sendRegistrationConfirmation(user: User): Promise<string> {
    const template = this.getRegistrationConfirmationTemplate(user);
    
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'registration_confirmation',
      priority: 8, // High priority for registration confirmations
      data: { userId: user.id }
    });
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(user: User): Promise<string> {
    const template = this.getWelcomeEmailTemplate(user);
    
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'welcome',
      priority: 7, // Medium-high priority for welcome emails
      data: { userId: user.id }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<string> {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    
    const template = this.getPasswordResetTemplate(user, resetUrl);
    
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'password_reset',
      priority: 9, // High priority for security-related emails
      data: { userId: user.id, resetToken }
    });
  }

  /**
   * Send submission confirmation email
   */
  async sendSubmissionConfirmation(userEmail: string, userName: string, submission: any): Promise<string> {
    const template = this.getSubmissionConfirmationTemplate(userName, submission);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'submission_confirmation',
      priority: 6, // Medium priority for submission confirmations
      data: { submissionId: submission.id, userName }
    });
  }

  /**
   * Send submission status update email
   */
  async sendSubmissionStatusUpdate(
    userEmail: string, 
    userName: string, 
    submission: any, 
    newStatus: string, 
    adminNotes?: string
  ): Promise<string> {
    const template = this.getSubmissionStatusUpdateTemplate(userName, submission, newStatus, adminNotes);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'submission_status_update',
      priority: 7, // Medium-high priority for status updates
      data: { submissionId: submission.id, userName, newStatus, adminNotes }
    });
  }

  /**
   * Send manuscript upload confirmation email
   */
  async sendManuscriptUploadConfirmation(
    userEmail: string, 
    userName: string, 
    submission: any, 
    filename: string
  ): Promise<string> {
    const template = this.getManuscriptUploadConfirmationTemplate(userName, submission, filename);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'manuscript_upload_confirmation',
      priority: 5, // Medium priority for manuscript confirmations
      data: { submissionId: submission.id, userName, filename }
    });
  }

  /**
   * Send payment verification email
   */
  async sendPaymentVerificationEmail(
    userEmail: string, 
    userName: string, 
    paymentRecord: any
  ): Promise<string> {
    const template = this.getPaymentVerificationTemplate(userName, paymentRecord);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'payment_verification',
      priority: 8, // High priority for payment confirmations
      data: { paymentId: paymentRecord.id, userName }
    });
  }

  /**
   * Send payment rejection email
   */
  async sendPaymentRejectionEmail(
    userEmail: string, 
    userName: string, 
    paymentRecord: any, 
    rejectionReason: string
  ): Promise<string> {
    const template = this.getPaymentRejectionTemplate(userName, paymentRecord, rejectionReason);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'payment_rejection',
      priority: 8, // High priority for payment issues
      data: { paymentId: paymentRecord.id, userName, rejectionReason }
    });
  }

  /**
   * Send review assignment email
   */
  async sendReviewAssignmentEmail(
    reviewerEmail: string, 
    reviewerName: string, 
    submission: any, 
    deadline: Date
  ): Promise<string> {
    const template = this.getReviewAssignmentTemplate(reviewerName, submission, deadline);
    
    return await this.sendEmail({
      to: reviewerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'review_assignment',
      priority: 7, // Medium-high priority for review assignments
      data: { submissionId: submission.id, reviewerName, deadline }
    });
  }

  /**
   * Send review reminder email
   */
  async sendReviewReminderEmail(
    reviewerEmail: string, 
    reviewerName: string, 
    submission: any, 
    deadline: Date, 
    daysRemaining: number
  ): Promise<string> {
    const template = this.getReviewReminderTemplate(reviewerName, submission, deadline, daysRemaining);
    
    return await this.sendEmail({
      to: reviewerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'review_reminder',
      priority: 6, // Medium priority for reminders
      data: { submissionId: submission.id, reviewerName, deadline, daysRemaining }
    });
  }

  /**
   * Send deadline reminder email
   */
  async sendDeadlineReminderEmail(
    userEmail: string, 
    userName: string, 
    deadlineType: string, 
    deadline: Date, 
    daysRemaining: number
  ): Promise<string> {
    const template = this.getDeadlineReminderTemplate(userName, deadlineType, deadline, daysRemaining);
    
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: 'deadline_reminder',
      priority: 6, // Medium priority for general reminders
      data: { userName, deadlineType, deadline, daysRemaining }
    });
  }

  /**
   * Direct email sending method (bypasses queue)
   */
  private async sendEmailDirect(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Generic email sending method (uses queue)
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: EmailType;
    priority?: number;
    scheduledAt?: Date;
    data?: any;
  }): Promise<string> {
    return await this.queueEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      type: options.type,
      priority: options.priority || 5,
      maxAttempts: 3,
      scheduledAt: options.scheduledAt,
      data: options.data
    });
  }

  /**
   * Email verification template
   */
  private getVerificationEmailTemplate(user: User, verificationUrl: string): EmailTemplate {
    const subject = 'Verify Your Email - International Conference Registration';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to the International Conference</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Thank you for registering for the International Conference as a <strong>${user.participantType.replace(/_/g, ' ')}</strong>.</p>
            <p>To complete your registration, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to the International Conference!
      
      Hello ${user.firstName} ${user.lastName},
      
      Thank you for registering for the International Conference as a ${user.participantType.replace(/_/g, ' ')}.
      
      To complete your registration, please verify your email address by visiting:
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create this account, please ignore this email.
      
      International Conference Organization
    `;

    return { subject, html, text };
  }

  /**
   * Registration confirmation template
   */
  private getRegistrationConfirmationTemplate(user: User): EmailTemplate {
    const subject = 'Registration Confirmed - International Conference';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Registration Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Registration Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Your email has been verified and your registration is now complete!</p>
            
            <div class="info-box">
              <h3>Registration Details:</h3>
              <p><strong>Participant Type:</strong> ${user.participantType.replace(/_/g, ' ')}</p>
              <p><strong>Registration Fee:</strong> $${user.registrationFee}</p>
              <p><strong>Registration Date:</strong> ${user.registrationDate.toLocaleDateString()}</p>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Complete your payment (if applicable)</li>
              <li>Submit your abstract (for presenters)</li>
              <li>Check your dashboard for updates</li>
            </ol>
            
            <p>You can now log in to your account and access all conference features.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Need help? Contact us at support@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Registration Confirmed!
      
      Hello ${user.firstName} ${user.lastName},
      
      Your email has been verified and your registration is now complete!
      
      Registration Details:
      - Participant Type: ${user.participantType.replace(/_/g, ' ')}
      - Registration Fee: $${user.registrationFee}
      - Registration Date: ${user.registrationDate.toLocaleDateString()}
      
      Next Steps:
      1. Complete your payment (if applicable)
      2. Submit your abstract (for presenters)
      3. Check your dashboard for updates
      
      You can now log in to your account and access all conference features.
      
      International Conference Organization
      Need help? Contact us at support@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(user: User): EmailTemplate {
    const subject = 'Welcome to the International Conference!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8e44ad; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to the Conference!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName},</h2>
            <p>Welcome to the International Conference community! We're excited to have you join us.</p>
            
            <h3>Conference Sessions Available:</h3>
            <ul>
              <li><strong>CHE</strong> - Computational Chemistry</li>
              <li><strong>CSE</strong> - High Performance Computing/Computer Science/Engineering</li>
              <li><strong>BIO</strong> - Computational Biology/Bioinformatics/Biochemistry/Biophysics</li>
              <li><strong>MST</strong> - Mathematics and Statistics</li>
              <li><strong>PFD</strong> - Computational Physics/Computational Fluid Dynamics/Solid Mechanics</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${this.baseUrl}/dashboard" class="button">Access Your Dashboard</a>
            </p>
            
            <p>Stay tuned for updates about the conference schedule, keynote speakers, and important deadlines.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Follow us for updates and announcements!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to the International Conference!
      
      Hello ${user.firstName},
      
      Welcome to the International Conference community! We're excited to have you join us.
      
      Conference Sessions Available:
      - CHE - Computational Chemistry
      - CSE - High Performance Computing/Computer Science/Engineering  
      - BIO - Computational Biology/Bioinformatics/Biochemistry/Biophysics
      - MST - Mathematics and Statistics
      - PFD - Computational Physics/Computational Fluid Dynamics/Solid Mechanics
      
      Access your dashboard at: ${this.baseUrl}/dashboard
      
      Stay tuned for updates about the conference schedule, keynote speakers, and important deadlines.
      
      International Conference Organization
    `;

    return { subject, html, text };
  }

  /**
   * Password reset template
   */
  private getPasswordResetTemplate(user: User, resetUrl: string): EmailTemplate {
    const subject = 'Password Reset Request - International Conference';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName},</h2>
            <p>We received a request to reset your password for your International Conference account.</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            This is an automated security message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hello ${user.firstName},
      
      We received a request to reset your password for your International Conference account.
      
      Reset your password by visiting: ${resetUrl}
      
      Security Notice:
      - This link will expire in 1 hour
      - If you didn't request this reset, please ignore this email
      - Your password will remain unchanged until you create a new one
      
      International Conference Organization
    `;

    return { subject, html, text };
  }

  /**
   * Submission confirmation template
   */
  private getSubmissionConfirmationTemplate(userName: string, submission: any): EmailTemplate {
    const subject = `Abstract Submission Confirmed - ${submission.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Submission Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Abstract Submission Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Your abstract submission has been successfully received and confirmed!</p>
            
            <div class="info-box">
              <h3>Submission Details:</h3>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>Title:</strong> ${submission.title}</p>
              <p><strong>Session:</strong> ${submission.sessionType}</p>
              <p><strong>Presentation Type:</strong> ${submission.presentationType}</p>
              <p><strong>Status:</strong> ${submission.status}</p>
              <p><strong>Submitted:</strong> ${new Date(submission.submissionDate).toLocaleDateString()}</p>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Your submission will be reviewed by our committee</li>
              <li>You'll receive updates on the review status</li>
              <li>You can edit your submission until the deadline</li>
              <li>Check your dashboard for updates</li>
            </ul>
            
            <p>Thank you for your contribution to the International Conference!</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at submissions@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Abstract Submission Confirmed
      
      Hello ${userName},
      
      Your abstract submission has been successfully received and confirmed!
      
      Submission Details:
      - Submission ID: ${submission.id}
      - Title: ${submission.title}
      - Session: ${submission.sessionType}
      - Presentation Type: ${submission.presentationType}
      - Status: ${submission.status}
      - Submitted: ${new Date(submission.submissionDate).toLocaleDateString()}
      
      What's Next?
      - Your submission will be reviewed by our committee
      - You'll receive updates on the review status
      - You can edit your submission until the deadline
      - Check your dashboard for updates
      
      Thank you for your contribution to the International Conference!
      
      International Conference Organization
      Questions? Contact us at submissions@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Submission status update template
   */
  private getSubmissionStatusUpdateTemplate(
    userName: string, 
    submission: any, 
    newStatus: string, 
    adminNotes?: string
  ): EmailTemplate {
    const statusMessages: Record<string, string> = {
      'under_review': 'Your submission is now under review',
      'accepted': '🎉 Congratulations! Your submission has been accepted',
      'rejected': 'Your submission was not accepted',
      'submitted': 'Your submission has been received'
    };

    const statusColors: Record<string, string> = {
      'under_review': '#f39c12',
      'accepted': '#27ae60',
      'rejected': '#e74c3c',
      'submitted': '#3498db'
    };

    const subject = `Submission Status Update: ${submission.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Submission Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColors[newStatus] || '#3498db'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .notes-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusMessages[newStatus] || 'Submission Status Updated'}</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We have an update regarding your abstract submission.</p>
            
            <div class="info-box">
              <h3>Submission Details:</h3>
              <p><strong>Title:</strong> ${submission.title}</p>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || '#3498db'}; font-weight: bold;">${newStatus.replace('_', ' ').toUpperCase()}</span></p>
            </div>
            
            ${adminNotes ? `
            <div class="notes-box">
              <h3>Review Notes:</h3>
              <p>${adminNotes}</p>
            </div>
            ` : ''}
            
            ${newStatus === 'accepted' ? `
            <h3>Next Steps:</h3>
            <ul>
              <li>Prepare your presentation materials</li>
              <li>Check the conference schedule for your session</li>
              <li>Submit your full manuscript if required</li>
            </ul>
            ` : ''}
            
            ${newStatus === 'rejected' ? `
            <p>While we appreciate your contribution, your submission was not selected for this conference. We encourage you to consider submitting to future conferences.</p>
            ` : ''}
            
            <p>You can view more details in your dashboard.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at submissions@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Submission Status Update
      
      Hello ${userName},
      
      We have an update regarding your abstract submission.
      
      Submission Details:
      - Title: ${submission.title}
      - Submission ID: ${submission.id}
      - New Status: ${newStatus.replace('_', ' ').toUpperCase()}
      
      ${adminNotes ? `Review Notes: ${adminNotes}` : ''}
      
      ${newStatus === 'accepted' ? `
      Next Steps:
      - Prepare your presentation materials
      - Check the conference schedule for your session
      - Submit your full manuscript if required
      ` : ''}
      
      ${newStatus === 'rejected' ? 
        'While we appreciate your contribution, your submission was not selected for this conference. We encourage you to consider submitting to future conferences.' : ''}
      
      You can view more details in your dashboard.
      
      International Conference Organization
      Questions? Contact us at submissions@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Manuscript upload confirmation template
   */
  private getManuscriptUploadConfirmationTemplate(
    userName: string, 
    submission: any, 
    filename: string
  ): EmailTemplate {
    const subject = `Manuscript Upload Confirmed - ${submission.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Manuscript Upload Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Manuscript Upload Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Your manuscript has been successfully uploaded and is now available for review!</p>
            
            <div class="info-box">
              <h3>Upload Details:</h3>
              <p><strong>Submission:</strong> ${submission.title}</p>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>Filename:</strong> ${filename}</p>
              <p><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${submission.status}</p>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Your manuscript will be reviewed along with your abstract</li>
              <li>You can replace the manuscript if needed (before final review)</li>
              <li>You'll receive updates on the review progress</li>
              <li>Check your dashboard for any updates</li>
            </ul>
            
            <p><strong>Note:</strong> You can upload a new version of your manuscript at any time before the final review decision.</p>
            
            <p>Thank you for your submission to the International Conference!</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at submissions@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Manuscript Upload Confirmed
      
      Hello ${userName},
      
      Your manuscript has been successfully uploaded and is now available for review!
      
      Upload Details:
      - Submission: ${submission.title}
      - Submission ID: ${submission.id}
      - Filename: ${filename}
      - Upload Date: ${new Date().toLocaleDateString()}
      - Status: ${submission.status}
      
      What's Next?
      - Your manuscript will be reviewed along with your abstract
      - You can replace the manuscript if needed (before final review)
      - You'll receive updates on the review progress
      - Check your dashboard for any updates
      
      Note: You can upload a new version of your manuscript at any time before the final review decision.
      
      Thank you for your submission to the International Conference!
      
      International Conference Organization
      Questions? Contact us at submissions@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Payment verification template
   */
  private getPaymentVerificationTemplate(userName: string, paymentRecord: any): EmailTemplate {
    const subject = '✅ Payment Verified - International Conference';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Verified</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #d5f4e6; padding: 15px; margin: 15px 0; border-left: 4px solid #27ae60; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Payment Verified!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Great news! Your payment has been successfully verified and your registration is now complete.</p>
            
            <div class="info-box">
              <h3>Payment Details:</h3>
              <p><strong>Payment ID:</strong> ${paymentRecord.id}</p>
              <p><strong>Amount:</strong> ${paymentRecord.amount} ${paymentRecord.currency}</p>
              <p><strong>Verification Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">VERIFIED</span></p>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>You now have full access to all conference features</li>
              <li>You can submit abstracts and manuscripts</li>
              <li>Access conference materials and schedules</li>
              <li>Receive updates about the conference</li>
            </ul>
            
            <p>Thank you for your participation in the International Conference!</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at payments@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Verified!
      
      Hello ${userName},
      
      Great news! Your payment has been successfully verified and your registration is now complete.
      
      Payment Details:
      - Payment ID: ${paymentRecord.id}
      - Amount: ${paymentRecord.amount} ${paymentRecord.currency}
      - Verification Date: ${new Date().toLocaleDateString()}
      - Status: VERIFIED
      
      What's Next?
      - You now have full access to all conference features
      - You can submit abstracts and manuscripts
      - Access conference materials and schedules
      - Receive updates about the conference
      
      Thank you for your participation in the International Conference!
      
      International Conference Organization
      Questions? Contact us at payments@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Payment rejection template
   */
  private getPaymentRejectionTemplate(userName: string, paymentRecord: any, rejectionReason: string): EmailTemplate {
    const subject = '❌ Payment Verification Issue - International Conference';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Verification Issue</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .warning-box { background-color: #fdf2e9; border: 1px solid #e67e22; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Verification Issue</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We've reviewed your payment submission, but unfortunately we cannot verify it at this time.</p>
            
            <div class="info-box">
              <h3>Payment Details:</h3>
              <p><strong>Payment ID:</strong> ${paymentRecord.id}</p>
              <p><strong>Amount:</strong> ${paymentRecord.amount} ${paymentRecord.currency}</p>
              <p><strong>Review Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: #e74c3c; font-weight: bold;">REJECTED</span></p>
            </div>
            
            <div class="warning-box">
              <h3>Reason for Rejection:</h3>
              <p>${rejectionReason}</p>
            </div>
            
            <h3>Next Steps:</h3>
            <ul>
              <li>Review the rejection reason above</li>
              <li>Prepare a new proof of payment that addresses the issue</li>
              <li>Submit the corrected payment proof through your dashboard</li>
              <li>Contact us if you need assistance</li>
            </ul>
            
            <p><strong>Note:</strong> Your registration remains active while you resolve this payment issue.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Need help? Contact us at payments@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Verification Issue
      
      Hello ${userName},
      
      We've reviewed your payment submission, but unfortunately we cannot verify it at this time.
      
      Payment Details:
      - Payment ID: ${paymentRecord.id}
      - Amount: ${paymentRecord.amount} ${paymentRecord.currency}
      - Review Date: ${new Date().toLocaleDateString()}
      - Status: REJECTED
      
      Reason for Rejection:
      ${rejectionReason}
      
      Next Steps:
      - Review the rejection reason above
      - Prepare a new proof of payment that addresses the issue
      - Submit the corrected payment proof through your dashboard
      - Contact us if you need assistance
      
      Note: Your registration remains active while you resolve this payment issue.
      
      International Conference Organization
      Need help? Contact us at payments@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Review assignment template
   */
  private getReviewAssignmentTemplate(reviewerName: string, submission: any, deadline: Date): EmailTemplate {
    const subject = `Review Assignment - ${submission.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Review Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8e44ad; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .deadline-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #8e44ad; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Review Assignment</h1>
          </div>
          <div class="content">
            <h2>Hello ${reviewerName},</h2>
            <p>You have been assigned a new submission to review for the International Conference.</p>
            
            <div class="info-box">
              <h3>Submission Details:</h3>
              <p><strong>Title:</strong> ${submission.title}</p>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>Session:</strong> ${submission.sessionType}</p>
              <p><strong>Presentation Type:</strong> ${submission.presentationType}</p>
              <p><strong>Authors:</strong> ${submission.authors?.map((a: any) => a.name).join(', ') || 'Not specified'}</p>
            </div>
            
            <div class="deadline-box">
              <h3>⏰ Review Deadline:</h3>
              <p><strong>${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}</strong></p>
              <p>Please complete your review by this date to ensure timely processing.</p>
            </div>
            
            <h3>Review Guidelines:</h3>
            <ul>
              <li>Evaluate the abstract for clarity, originality, and relevance</li>
              <li>Consider the technical quality and methodology</li>
              <li>Provide constructive feedback for the authors</li>
              <li>Rate the submission on the provided scale</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${this.baseUrl}/reviews" class="button">Start Review</a>
            </p>
            
            <p>Thank you for your contribution to the review process!</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at reviews@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      New Review Assignment
      
      Hello ${reviewerName},
      
      You have been assigned a new submission to review for the International Conference.
      
      Submission Details:
      - Title: ${submission.title}
      - Submission ID: ${submission.id}
      - Session: ${submission.sessionType}
      - Presentation Type: ${submission.presentationType}
      - Authors: ${submission.authors?.map((a: any) => a.name).join(', ') || 'Not specified'}
      
      Review Deadline: ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}
      Please complete your review by this date to ensure timely processing.
      
      Review Guidelines:
      - Evaluate the abstract for clarity, originality, and relevance
      - Consider the technical quality and methodology
      - Provide constructive feedback for the authors
      - Rate the submission on the provided scale
      
      Access your review dashboard at: ${this.baseUrl}/reviews
      
      Thank you for your contribution to the review process!
      
      International Conference Organization
      Questions? Contact us at reviews@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Review reminder template
   */
  private getReviewReminderTemplate(reviewerName: string, submission: any, deadline: Date, daysRemaining: number): EmailTemplate {
    const subject = `Review Reminder - ${submission.title} (${daysRemaining} days remaining)`;
    
    const urgencyColor = daysRemaining <= 1 ? '#e74c3c' : daysRemaining <= 3 ? '#f39c12' : '#3498db';
    const urgencyMessage = daysRemaining <= 1 ? 'URGENT' : daysRemaining <= 3 ? 'Important' : 'Reminder';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Review Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .deadline-box { background-color: #fdf2e9; border: 1px solid ${urgencyColor}; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ ${urgencyMessage}: Review Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${reviewerName},</h2>
            <p>This is a ${urgencyMessage.toLowerCase()} reminder about your pending review assignment.</p>
            
            <div class="info-box">
              <h3>Submission Details:</h3>
              <p><strong>Title:</strong> ${submission.title}</p>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>Session:</strong> ${submission.sessionType}</p>
            </div>
            
            <div class="deadline-box">
              <h3>⚠️ Deadline Approaching:</h3>
              <p><strong>Due:</strong> ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}</p>
              <p><strong>Time Remaining:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</span></p>
            </div>
            
            ${daysRemaining <= 1 ? `
            <p style="color: #e74c3c; font-weight: bold;">⚠️ This review is due very soon! Please complete it as soon as possible to avoid delays in the review process.</p>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${this.baseUrl}/reviews" class="button">Complete Review Now</a>
            </p>
            
            <p>If you're unable to complete this review, please contact us immediately so we can reassign it.</p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Need help? Contact us at reviews@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${urgencyMessage}: Review Reminder
      
      Hello ${reviewerName},
      
      This is a ${urgencyMessage.toLowerCase()} reminder about your pending review assignment.
      
      Submission Details:
      - Title: ${submission.title}
      - Submission ID: ${submission.id}
      - Session: ${submission.sessionType}
      
      Deadline Approaching:
      - Due: ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}
      - Time Remaining: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}
      
      ${daysRemaining <= 1 ? 'This review is due very soon! Please complete it as soon as possible to avoid delays in the review process.' : ''}
      
      Complete your review at: ${this.baseUrl}/reviews
      
      If you're unable to complete this review, please contact us immediately so we can reassign it.
      
      International Conference Organization
      Need help? Contact us at reviews@conference.org
    `;

    return { subject, html, text };
  }

  /**
   * Deadline reminder template
   */
  private getDeadlineReminderTemplate(userName: string, deadlineType: string, deadline: Date, daysRemaining: number): EmailTemplate {
    const subject = `Reminder: ${deadlineType} Deadline - ${daysRemaining} days remaining`;
    
    const urgencyColor = daysRemaining <= 1 ? '#e74c3c' : daysRemaining <= 3 ? '#f39c12' : '#3498db';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Deadline Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .deadline-box { background-color: #fdf2e9; border: 1px solid ${urgencyColor}; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Deadline Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>This is a friendly reminder about an upcoming deadline for the International Conference.</p>
            
            <div class="deadline-box">
              <h3>📅 ${deadlineType} Deadline:</h3>
              <p><strong>Due:</strong> ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}</p>
              <p><strong>Time Remaining:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</span></p>
            </div>
            
            ${daysRemaining <= 1 ? `
            <p style="color: #e74c3c; font-weight: bold;">⚠️ This deadline is approaching very soon! Please take action immediately.</p>
            ` : daysRemaining <= 3 ? `
            <p style="color: #f39c12; font-weight: bold;">⚠️ This deadline is approaching soon. Please plan to complete your tasks.</p>
            ` : ''}
            
            <h3>What you can do:</h3>
            <ul>
              <li>Check your dashboard for pending tasks</li>
              <li>Complete any outstanding submissions</li>
              <li>Upload required documents</li>
              <li>Contact us if you need assistance</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${this.baseUrl}/dashboard" class="button">Go to Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>International Conference Organization<br>
            Questions? Contact us at support@conference.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Deadline Reminder
      
      Hello ${userName},
      
      This is a friendly reminder about an upcoming deadline for the International Conference.
      
      ${deadlineType} Deadline:
      - Due: ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}
      - Time Remaining: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}
      
      ${daysRemaining <= 1 ? 'This deadline is approaching very soon! Please take action immediately.' : 
        daysRemaining <= 3 ? 'This deadline is approaching soon. Please plan to complete your tasks.' : ''}
      
      What you can do:
      - Check your dashboard for pending tasks
      - Complete any outstanding submissions
      - Upload required documents
      - Contact us if you need assistance
      
      Access your dashboard at: ${this.baseUrl}/dashboard
      
      International Conference Organization
      Questions? Contact us at support@conference.org
    `;

    return { subject, html, text };
  }
}