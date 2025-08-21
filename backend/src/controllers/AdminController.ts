import { Request, Response } from 'express';
import { Database } from '../database/connection.js';
import { UserRepository } from '../models/UserRepository.js';
import { SubmissionRepository } from '../models/SubmissionRepository.js';
import { ReviewRepository } from '../models/ReviewRepository.js';
import { EmailService } from '../services/EmailService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { 
  UserRole, 
  PaymentStatus,
  UserResponse,
  SessionType,
  SubmissionStatus 
} from '../types/index.js';

export class AdminController {
  private static emailService = new EmailService();
  /**
   * Get all users with pagination and filtering
   * GET /api/admin/users
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = '1', 
        limit = '20', 
        role, 
        participantType, 
        paymentStatus,
        search 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build query conditions
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramCount = 1;

      if (role) {
        conditions.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      if (participantType) {
        conditions.push(`participant_type = $${paramCount}`);
        values.push(participantType);
        paramCount++;
      }

      if (paymentStatus) {
        conditions.push(`payment_status = $${paramCount}`);
        values.push(paymentStatus);
        paramCount++;
      }

      if (search) {
        conditions.push(`(
          LOWER(first_name) LIKE LOWER($${paramCount}) OR 
          LOWER(last_name) LIKE LOWER($${paramCount}) OR 
          LOWER(email) LIKE LOWER($${paramCount}) OR 
          LOWER(affiliation) LIKE LOWER($${paramCount})
        )`);
        values.push(`%${search}%`);
        paramCount++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await Database.query(countQuery, values);
      const totalUsers = parseInt(countResult.rows[0].count);

      // Get users with pagination
      const usersQuery = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      values.push(limitNum, offset);

      const usersResult = await Database.query(usersQuery, values);
      const users = usersResult.rows.map(UserRepository.mapRowToUser);

      // Get sessions for each user
      const usersWithSessions: UserResponse[] = [];
      for (const user of users) {
        const sessions = await UserRepository.getUserSessions(user.id);
        usersWithSessions.push(UserRepository.mapUserToResponse(user, sessions));
      }

      res.json({
        success: true,
        data: {
          users: usersWithSessions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalUsers,
            totalPages: Math.ceil(totalUsers / limitNum)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USERS_FAILED',
          message: 'Failed to fetch users'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user role
   * PUT /api/admin/users/:userId/role
   */
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['participant', 'presenter', 'organizer', 'reviewer', 'admin'].includes(role)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role. Must be one of: participant, presenter, organizer, reviewer, admin'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedUser = await UserRepository.updateRole(userId, role as UserRole);
      
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userWithSessions = await UserRepository.findByIdWithSessions(userId);

      res.json({
        success: true,
        data: { 
          user: userWithSessions,
          message: 'User role updated successfully'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ROLE_FAILED',
          message: 'Failed to update user role'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user payment status
   * PUT /api/admin/users/:userId/payment-status
   */
  static async updateUserPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { paymentStatus } = req.body;

      const validStatuses: PaymentStatus[] = ['not_paid', 'payment_submitted', 'payment_verified', 'payment_rejected'];
      
      if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYMENT_STATUS',
            message: 'Invalid payment status. Must be one of: not_paid, payment_submitted, payment_verified, payment_rejected'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedUser = await UserRepository.updatePaymentStatus(userId, paymentStatus);
      
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userWithSessions = await UserRepository.findByIdWithSessions(userId);

      res.json({
        success: true,
        data: { 
          user: userWithSessions,
          message: 'User payment status updated successfully'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update user payment status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PAYMENT_STATUS_FAILED',
          message: 'Failed to update user payment status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Deactivate user account
   * DELETE /api/admin/users/:userId
   */
  static async deactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.userId;

      // Prevent self-deactivation
      if (userId === requestingUserId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DEACTIVATE_SELF',
            message: 'Cannot deactivate your own account'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const success = await UserRepository.deactivate(userId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'User account deactivated successfully' },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DEACTIVATE_USER_FAILED',
          message: 'Failed to deactivate user'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user statistics and analytics
   * GET /api/admin/users/statistics
   */
  static async getUserStatistics(_req: Request, res: Response): Promise<void> {
    try {
      // Get user counts by role
      const roleStatsQuery = `
        SELECT role, COUNT(*) as count 
        FROM users 
        WHERE is_active = true 
        GROUP BY role
      `;
      const roleStatsResult = await Database.query(roleStatsQuery);
      const roleStats = roleStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      }, {});

      // Get user counts by participant type
      const participantStatsQuery = `
        SELECT participant_type, COUNT(*) as count 
        FROM users 
        WHERE is_active = true 
        GROUP BY participant_type
      `;
      const participantStatsResult = await Database.query(participantStatsQuery);
      const participantStats = participantStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.participant_type] = parseInt(row.count);
        return acc;
      }, {});

      // Get payment status statistics
      const paymentStatsQuery = `
        SELECT payment_status, COUNT(*) as count 
        FROM users 
        WHERE is_active = true 
        GROUP BY payment_status
      `;
      const paymentStatsResult = await Database.query(paymentStatsQuery);
      const paymentStats = paymentStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.payment_status] = parseInt(row.count);
        return acc;
      }, {});

      // Get registration timeline (last 30 days)
      const timelineQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as registrations
        FROM users 
        WHERE is_active = true 
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      const timelineResult = await Database.query(timelineQuery);
      const registrationTimeline = timelineResult.rows;

      // Get session popularity
      const sessionStatsQuery = `
        SELECT session_type, COUNT(*) as count
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE u.is_active = true
        GROUP BY session_type
        ORDER BY count DESC
      `;
      const sessionStatsResult = await Database.query(sessionStatsQuery);
      const sessionStats = sessionStatsResult.rows;

      // Get total counts
      const totalUsersQuery = 'SELECT COUNT(*) as total FROM users WHERE is_active = true';
      const totalUsersResult = await Database.query(totalUsersQuery);
      const totalUsers = parseInt(totalUsersResult.rows[0].total);

      res.json({
        success: true,
        data: {
          totalUsers,
          roleDistribution: roleStats,
          participantTypeDistribution: participantStats,
          paymentStatusDistribution: paymentStats,
          registrationTimeline,
          sessionPopularity: sessionStats
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get user statistics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_STATISTICS_FAILED',
          message: 'Failed to fetch user statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get submission statistics and monitoring data
   * GET /api/admin/submissions/statistics
   */
  static async getSubmissionStatistics(_req: Request, res: Response): Promise<void> {
    try {
      // Get submission counts by status
      const statusStatsQuery = `
        SELECT status, COUNT(*) as count 
        FROM submissions 
        GROUP BY status
      `;
      const statusStatsResult = await Database.query(statusStatsQuery);
      const statusStats = statusStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      // Get submission counts by session type
      const sessionStatsQuery = `
        SELECT session_type, COUNT(*) as count 
        FROM submissions 
        GROUP BY session_type
      `;
      const sessionStatsResult = await Database.query(sessionStatsQuery);
      const sessionStats = sessionStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.session_type] = parseInt(row.count);
        return acc;
      }, {});

      // Get submission timeline (last 30 days)
      const timelineQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as submissions
        FROM submissions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      const timelineResult = await Database.query(timelineQuery);
      const submissionTimeline = timelineResult.rows;

      // Get presentation type distribution
      const presentationStatsQuery = `
        SELECT presentation_type, COUNT(*) as count 
        FROM submissions 
        GROUP BY presentation_type
      `;
      const presentationStatsResult = await Database.query(presentationStatsQuery);
      const presentationStats = presentationStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.presentation_type] = parseInt(row.count);
        return acc;
      }, {});

      // Get total submissions
      const totalSubmissionsQuery = 'SELECT COUNT(*) as total FROM submissions';
      const totalSubmissionsResult = await Database.query(totalSubmissionsQuery);
      const totalSubmissions = parseInt(totalSubmissionsResult.rows[0].total);

      res.json({
        success: true,
        data: {
          totalSubmissions,
          statusDistribution: statusStats,
          sessionDistribution: sessionStats,
          presentationTypeDistribution: presentationStats,
          submissionTimeline
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get submission statistics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SUBMISSION_STATISTICS_FAILED',
          message: 'Failed to fetch submission statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get review progress and monitoring data
   * GET /api/admin/reviews/progress
   */
  static async getReviewProgress(_req: Request, res: Response): Promise<void> {
    try {
      // Get review completion statistics
      const reviewStatsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_reviews,
          COUNT(CASE WHEN is_completed = false THEN 1 END) as pending_reviews
        FROM reviews
      `;
      const reviewStatsResult = await Database.query(reviewStatsQuery);
      const reviewStats = reviewStatsResult.rows[0];

      // Get reviews by recommendation
      const recommendationStatsQuery = `
        SELECT recommendation, COUNT(*) as count 
        FROM reviews 
        WHERE is_completed = true
        GROUP BY recommendation
      `;
      const recommendationStatsResult = await Database.query(recommendationStatsQuery);
      const recommendationStats = recommendationStatsResult.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.recommendation] = parseInt(row.count);
        return acc;
      }, {});

      // Get reviewer workload
      const workloadQuery = `
        SELECT 
          u.first_name,
          u.last_name,
          u.email,
          COUNT(r.id) as total_assigned,
          COUNT(CASE WHEN r.is_completed = true THEN 1 END) as completed,
          COUNT(CASE WHEN r.is_completed = false THEN 1 END) as pending
        FROM users u
        LEFT JOIN reviews r ON u.id = r.reviewer_id
        WHERE u.role IN ('reviewer', 'admin', 'organizer')
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY total_assigned DESC
      `;
      const workloadResult = await Database.query(workloadQuery);
      const reviewerWorkload = workloadResult.rows;

      // Get submissions needing reviews
      const needsReviewQuery = `
        SELECT 
          s.id,
          s.title,
          s.session_type,
          s.status,
          COUNT(r.id) as review_count,
          ARRAY_AGG(r.reviewer_id) FILTER (WHERE r.reviewer_id IS NOT NULL) as assigned_reviewers
        FROM submissions s
        LEFT JOIN reviews r ON s.id = r.submission_id
        WHERE s.status IN ('submitted', 'under_review')
        GROUP BY s.id, s.title, s.session_type, s.status
        HAVING COUNT(r.id) < 3
        ORDER BY s.created_at ASC
      `;
      const needsReviewResult = await Database.query(needsReviewQuery);
      const submissionsNeedingReview = needsReviewResult.rows;

      res.json({
        success: true,
        data: {
          reviewStats: {
            totalReviews: parseInt(reviewStats.total_reviews),
            completedReviews: parseInt(reviewStats.completed_reviews),
            pendingReviews: parseInt(reviewStats.pending_reviews),
            completionRate: reviewStats.total_reviews > 0 
              ? (parseInt(reviewStats.completed_reviews) / parseInt(reviewStats.total_reviews) * 100).toFixed(1)
              : '0'
          },
          recommendationDistribution: recommendationStats,
          reviewerWorkload,
          submissionsNeedingReview
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get review progress error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_REVIEW_PROGRESS_FAILED',
          message: 'Failed to fetch review progress'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send reminder emails to reviewers with pending reviews
   * POST /api/admin/reviews/send-reminders
   */
  static async sendReviewReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reviewerIds, message } = req.body;

      if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REVIEWER_IDS',
            message: 'Reviewer IDs must be a non-empty array'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get pending reviews for specified reviewers
      const pendingReviewsQuery = `
        SELECT 
          r.id as review_id,
          r.reviewer_id,
          u.first_name,
          u.last_name,
          u.email,
          s.title as submission_title,
          s.session_type,
          r.created_at as assigned_date
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        JOIN submissions s ON r.submission_id = s.id
        WHERE r.reviewer_id = ANY($1) 
          AND r.is_completed = false
        ORDER BY r.created_at ASC
      `;
      
      const pendingReviewsResult = await Database.query(pendingReviewsQuery, [reviewerIds]);
      const pendingReviews = pendingReviewsResult.rows;

      if (pendingReviews.length === 0) {
        res.json({
          success: true,
          data: {
            message: 'No pending reviews found for specified reviewers',
            remindersSent: 0
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Group reviews by reviewer
      const reviewsByReviewer = pendingReviews.reduce((acc: Record<string, any[]>, review: any) => {
        const reviewerId = review.reviewer_id;
        if (!acc[reviewerId]) {
          acc[reviewerId] = [];
        }
        acc[reviewerId].push(review);
        return acc;
      }, {});

      let remindersSent = 0;

      // Send reminders using EmailService
      for (const [, reviews] of Object.entries(reviewsByReviewer)) {
        const reviewer = reviews[0]; // Get reviewer info from first review
        
        try {
          // Send reminder for each pending review
          for (const review of reviews as any[]) {
            // Calculate days remaining (assuming 14-day deadline from assignment)
            const assignedDate = new Date(review.assigned_date);
            const deadline = new Date(assignedDate);
            deadline.setDate(deadline.getDate() + 14);
            
            const now = new Date();
            const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            // Create submission object for email template
            const submission = {
              id: review.submission_id,
              title: review.submission_title,
              sessionType: review.session_type
            };
            
            await this.emailService.sendReviewReminderEmail(
              reviewer.email,
              `${reviewer.first_name} ${reviewer.last_name}`,
              submission,
              deadline,
              Math.max(0, daysRemaining)
            );
          }
          
          remindersSent++;
          console.log(`Reminder sent to ${reviewer.email} for ${reviews.length} pending reviews`);
        } catch (emailError) {
          console.error(`Failed to send reminder to ${reviewer.email}:`, emailError);
        }
      }

      res.json({
        success: true,
        data: {
          message: `Reminders sent successfully`,
          remindersSent,
          reviewersNotified: Object.keys(reviewsByReviewer).length,
          totalPendingReviews: pendingReviews.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Send review reminders error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_REMINDERS_FAILED',
          message: 'Failed to send review reminders'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get detailed submission and review monitoring dashboard
   * GET /api/admin/monitoring/dashboard
   */
  static async getMonitoringDashboard(_req: Request, res: Response): Promise<void> {
    try {
      // Get submissions by status and session
      const submissionOverviewQuery = `
        SELECT 
          session_type,
          status,
          COUNT(*) as count
        FROM submissions
        GROUP BY session_type, status
        ORDER BY session_type, status
      `;
      const submissionOverviewResult = await Database.query(submissionOverviewQuery);
      
      // Transform data for easier frontend consumption
      const submissionOverview: Record<string, Record<string, number>> = {};
      submissionOverviewResult.rows.forEach((row: any) => {
        if (!submissionOverview[row.session_type]) {
          submissionOverview[row.session_type] = {};
        }
        submissionOverview[row.session_type][row.status] = parseInt(row.count);
      });

      // Get recent activity
      const recentActivityQuery = `
        (
          SELECT 
            'submission' as type,
            s.title as title,
            u.first_name || ' ' || u.last_name as user_name,
            s.created_at as timestamp,
            s.status as status
          FROM submissions s
          JOIN users u ON s.user_id = u.id
          ORDER BY s.created_at DESC
          LIMIT 10
        )
        UNION ALL
        (
          SELECT 
            'review' as type,
            s.title as title,
            u.first_name || ' ' || u.last_name as user_name,
            r.updated_at as timestamp,
            CASE WHEN r.is_completed THEN 'completed' ELSE 'pending' END as status
          FROM reviews r
          JOIN submissions s ON r.submission_id = s.id
          JOIN users u ON r.reviewer_id = u.id
          ORDER BY r.updated_at DESC
          LIMIT 10
        )
        ORDER BY timestamp DESC
        LIMIT 20
      `;
      const recentActivityResult = await Database.query(recentActivityQuery);
      const recentActivity = recentActivityResult.rows;

      // Get overdue reviews (reviews assigned more than 14 days ago and not completed)
      const overdueReviewsQuery = `
        SELECT 
          r.id as review_id,
          s.title as submission_title,
          s.session_type,
          u.first_name || ' ' || u.last_name as reviewer_name,
          u.email as reviewer_email,
          r.created_at as assigned_date,
          EXTRACT(days FROM (CURRENT_TIMESTAMP - r.created_at)) as days_overdue
        FROM reviews r
        JOIN submissions s ON r.submission_id = s.id
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.is_completed = false 
          AND r.created_at < CURRENT_TIMESTAMP - INTERVAL '14 days'
        ORDER BY r.created_at ASC
      `;
      const overdueReviewsResult = await Database.query(overdueReviewsQuery);
      const overdueReviews = overdueReviewsResult.rows;

      res.json({
        success: true,
        data: {
          submissionOverview,
          recentActivity,
          overdueReviews,
          summary: {
            totalSubmissions: Object.values(submissionOverview).reduce((total, session) => 
              total + Object.values(session).reduce((sum, count) => sum + count, 0), 0),
            overdueReviewCount: overdueReviews.length,
            recentActivityCount: recentActivity.length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get monitoring dashboard error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_MONITORING_DASHBOARD_FAILED',
          message: 'Failed to fetch monitoring dashboard data'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system health and status information
   * GET /api/admin/system/health
   */
  static async getSystemHealth(_req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      const dbHealthQuery = 'SELECT NOW() as current_time, version() as db_version';
      const dbHealthResult = await Database.query(dbHealthQuery);
      const dbHealth = {
        status: 'healthy',
        currentTime: dbHealthResult.rows[0].current_time,
        version: dbHealthResult.rows[0].db_version,
        responseTime: Date.now()
      };

      // Get database statistics
      const dbStatsQuery = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY schemaname, tablename
      `;
      const dbStatsResult = await Database.query(dbStatsQuery);
      const databaseStats = dbStatsResult.rows;

      // Get system metrics
      const systemMetrics = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      };

      // Get application statistics
      const appStatsQueries = await Promise.all([
        Database.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
        Database.query('SELECT COUNT(*) as count FROM submissions'),
        Database.query('SELECT COUNT(*) as count FROM reviews'),
        Database.query('SELECT COUNT(*) as count FROM payment_records')
      ]);

      const applicationStats = {
        activeUsers: parseInt(appStatsQueries[0].rows[0].count),
        totalSubmissions: parseInt(appStatsQueries[1].rows[0].count),
        totalReviews: parseInt(appStatsQueries[2].rows[0].count),
        totalPayments: parseInt(appStatsQueries[3].rows[0].count)
      };

      res.json({
        success: true,
        data: {
          database: dbHealth,
          databaseStats,
          system: systemMetrics,
          application: applicationStats,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_HEALTH_CHECK_FAILED',
          message: 'Failed to check system health'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system configuration settings
   * GET /api/admin/system/config
   */
  static async getSystemConfig(_req: Request, res: Response): Promise<void> {
    try {
      // Get conference configuration
      const conferenceQuery = `
        SELECT 
          id,
          name,
          description,
          start_date,
          end_date,
          venue,
          registration_deadline,
          submission_deadline,
          created_at,
          updated_at
        FROM conferences 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const conferenceResult = await Database.query(conferenceQuery);
      const conference = conferenceResult.rows[0] || null;

      // Get session configuration
      const sessionsQuery = `
        SELECT 
          id,
          conference_id,
          type,
          name,
          description,
          created_at
        FROM sessions
        ORDER BY type
      `;
      const sessionsResult = await Database.query(sessionsQuery);
      const sessions = sessionsResult.rows;

      // Get payment instructions
      const paymentQuery = `
        SELECT 
          id,
          conference_id,
          bank_name,
          account_name,
          account_number,
          swift_code,
          routing_number,
          instructions,
          support_contact,
          created_at,
          updated_at
        FROM payment_instructions
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const paymentResult = await Database.query(paymentQuery);
      const paymentInstructions = paymentResult.rows[0] || null;

      // Get environment configuration (safe values only)
      const environmentConfig = {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '5000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        // Don't expose sensitive values like database credentials
      };

      res.json({
        success: true,
        data: {
          conference,
          sessions,
          paymentInstructions,
          environment: environmentConfig
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get system config error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SYSTEM_CONFIG_FAILED',
          message: 'Failed to fetch system configuration'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update system configuration
   * PUT /api/admin/system/config
   */
  static async updateSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { conference, paymentInstructions } = req.body;

      // Update conference configuration if provided
      if (conference) {
        const updateConferenceQuery = `
          UPDATE conferences 
          SET 
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            start_date = COALESCE($3, start_date),
            end_date = COALESCE($4, end_date),
            venue = COALESCE($5, venue),
            registration_deadline = COALESCE($6, registration_deadline),
            submission_deadline = COALESCE($7, submission_deadline),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM conferences ORDER BY created_at DESC LIMIT 1)
          RETURNING *
        `;

        await Database.query(updateConferenceQuery, [
          conference.name,
          conference.description,
          conference.startDate,
          conference.endDate,
          conference.venue,
          conference.registrationDeadline,
          conference.submissionDeadline
        ]);
      }

      // Update payment instructions if provided
      if (paymentInstructions) {
        const updatePaymentQuery = `
          UPDATE payment_instructions 
          SET 
            bank_name = COALESCE($1, bank_name),
            account_name = COALESCE($2, account_name),
            account_number = COALESCE($3, account_number),
            swift_code = COALESCE($4, swift_code),
            routing_number = COALESCE($5, routing_number),
            instructions = COALESCE($6, instructions),
            support_contact = COALESCE($7, support_contact),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM payment_instructions ORDER BY created_at DESC LIMIT 1)
          RETURNING *
        `;

        await Database.query(updatePaymentQuery, [
          paymentInstructions.bankName,
          paymentInstructions.accountName,
          paymentInstructions.accountNumber,
          paymentInstructions.swiftCode,
          paymentInstructions.routingNumber,
          paymentInstructions.instructions,
          paymentInstructions.supportContact
        ]);
      }

      res.json({
        success: true,
        data: { message: 'System configuration updated successfully' },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update system config error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SYSTEM_CONFIG_FAILED',
          message: 'Failed to update system configuration'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create database backup (metadata only for security)
   * POST /api/admin/system/backup
   */
  static async createBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { includeUserData = false } = req.body;

      // Get table schemas and row counts
      const tablesQuery = `
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name, 
            query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ) t
      `;
      const tablesResult = await Database.query(tablesQuery);
      const tableInfo = tablesResult.rows;

      // Create backup metadata
      const backupMetadata = {
        id: `backup_${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: req.user.userId,
        includeUserData,
        tables: tableInfo,
        databaseVersion: (await Database.query('SELECT version()')).rows[0].version,
        applicationVersion: '1.0.0' // This would come from package.json in a real app
      };

      // In a real implementation, you would:
      // 1. Create actual database dump using pg_dump
      // 2. Store the backup file securely
      // 3. Return the backup file path or download link

      res.json({
        success: true,
        data: {
          backup: backupMetadata,
          message: 'Backup metadata created successfully. In production, this would create an actual database dump.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_BACKUP_FAILED',
          message: 'Failed to create backup'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system logs (last 100 entries)
   * GET /api/admin/system/logs
   */
  static async getSystemLogs(_req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, you would read from actual log files
      // For now, we'll return some sample log entries
      const sampleLogs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'System health check completed successfully',
          source: 'AdminController'
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'INFO',
          message: 'User authentication successful',
          source: 'AuthController'
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'WARN',
          message: 'High memory usage detected',
          source: 'SystemMonitor'
        }
      ];

      res.json({
        success: true,
        data: {
          logs: sampleLogs,
          message: 'In production, this would return actual system logs from log files'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get system logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SYSTEM_LOGS_FAILED',
          message: 'Failed to fetch system logs'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}