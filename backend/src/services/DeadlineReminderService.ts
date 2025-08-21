import { Database } from '../database/connection.js';
import { EmailService } from './EmailService.js';
import { ConferenceRepository } from '../models/ConferenceRepository.js';

export class DeadlineReminderService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send submission deadline reminders
   */
  async sendSubmissionDeadlineReminders(): Promise<void> {
    try {
      // Get active conference with submission deadline
      const conferences = await ConferenceRepository.findAll();
      const conference = conferences.find(c => c.isActive);
      if (!conference || !conference.submissionDeadline) {
        console.log('No active conference with submission deadline found');
        return;
      }

      const deadline = new Date(conference.submissionDeadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only send reminders for 7, 3, and 1 day(s) before deadline
      if (![7, 3, 1].includes(daysUntilDeadline)) {
        return;
      }

      // Get users who haven't submitted abstracts yet (presenters and speakers)
      const query = `
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.participant_type
        FROM users u
        LEFT JOIN submissions s ON u.id = s.user_id
        WHERE u.participant_type IN ('oral_presenter', 'poster_presenter', 'keynote_speaker', 'panelist')
          AND u.is_active = true
          AND s.id IS NULL
      `;

      const result = await Database.query(query);
      const usersWithoutSubmissions = result.rows;

      console.log(`Sending submission deadline reminders to ${usersWithoutSubmissions.length} users (${daysUntilDeadline} days remaining)`);

      for (const user of usersWithoutSubmissions) {
        try {
          await this.emailService.sendDeadlineReminderEmail(
            user.email,
            `${user.first_name} ${user.last_name}`,
            'Abstract Submission',
            deadline,
            daysUntilDeadline
          );
        } catch (emailError) {
          console.error(`Failed to send submission deadline reminder to ${user.email}:`, emailError);
        }
      }

    } catch (error) {
      console.error('Error sending submission deadline reminders:', error);
    }
  }

  /**
   * Send registration deadline reminders
   */
  async sendRegistrationDeadlineReminders(): Promise<void> {
    try {
      // Get active conference with registration deadline
      const conferences = await ConferenceRepository.findAll();
      const conference = conferences.find(c => c.isActive);
      if (!conference || !conference.registrationDeadline) {
        console.log('No active conference with registration deadline found');
        return;
      }

      const deadline = new Date(conference.registrationDeadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only send reminders for 7, 3, and 1 day(s) before deadline
      if (![7, 3, 1].includes(daysUntilDeadline)) {
        return;
      }

      // Get users who haven't completed registration (no payment verified)
      const query = `
        SELECT id, email, first_name, last_name, participant_type, payment_status
        FROM users
        WHERE payment_status IN ('not_paid', 'payment_submitted', 'payment_rejected')
          AND is_active = true
      `;

      const result = await Database.query(query);
      const incompleteRegistrations = result.rows;

      console.log(`Sending registration deadline reminders to ${incompleteRegistrations.length} users (${daysUntilDeadline} days remaining)`);

      for (const user of incompleteRegistrations) {
        try {
          await this.emailService.sendDeadlineReminderEmail(
            user.email,
            `${user.first_name} ${user.last_name}`,
            'Registration and Payment',
            deadline,
            daysUntilDeadline
          );
        } catch (emailError) {
          console.error(`Failed to send registration deadline reminder to ${user.email}:`, emailError);
        }
      }

    } catch (error) {
      console.error('Error sending registration deadline reminders:', error);
    }
  }

  /**
   * Send review deadline reminders
   */
  async sendReviewDeadlineReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Get pending reviews with approaching deadlines
      const query = `
        SELECT 
          r.id as review_id,
          r.reviewer_id,
          r.submission_id,
          r.created_at as assigned_date,
          u.email,
          u.first_name,
          u.last_name,
          s.title as submission_title,
          s.session_type
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        JOIN submissions s ON r.submission_id = s.id
        WHERE r.is_completed = false
          AND r.created_at <= $1
      `;

      // Get reviews assigned more than 7 days ago (assuming 14-day deadline)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await Database.query(query, [sevenDaysAgo]);
      const pendingReviews = result.rows;

      console.log(`Checking ${pendingReviews.length} pending reviews for deadline reminders`);

      for (const review of pendingReviews) {
        try {
          // Calculate deadline (14 days from assignment)
          const assignedDate = new Date(review.assigned_date);
          const deadline = new Date(assignedDate);
          deadline.setDate(deadline.getDate() + 14);

          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Send reminders for 3 and 1 day(s) before deadline, and overdue reviews
          if ([3, 1, 0, -1, -2].includes(daysUntilDeadline)) {
            const submission = {
              id: review.submission_id,
              title: review.submission_title,
              sessionType: review.session_type
            };

            await this.emailService.sendReviewReminderEmail(
              review.email,
              `${review.first_name} ${review.last_name}`,
              submission,
              deadline,
              Math.max(0, daysUntilDeadline)
            );

            console.log(`Review reminder sent to ${review.email} for submission ${review.submission_title} (${daysUntilDeadline} days remaining)`);
          }

        } catch (emailError) {
          console.error(`Failed to send review deadline reminder to ${review.email}:`, emailError);
        }
      }

    } catch (error) {
      console.error('Error sending review deadline reminders:', error);
    }
  }

  /**
   * Run all deadline reminder checks
   */
  async runAllReminderChecks(): Promise<void> {
    console.log('Running deadline reminder checks...');
    
    await Promise.all([
      this.sendSubmissionDeadlineReminders(),
      this.sendRegistrationDeadlineReminders(),
      this.sendReviewDeadlineReminders()
    ]);

    console.log('Deadline reminder checks completed');
  }
}