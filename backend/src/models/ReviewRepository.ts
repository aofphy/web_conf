import { PoolClient } from 'pg';
import { Database } from '../database/connection.js';
import { 
  Review, 
  CreateReviewRequest, 
  UpdateReviewRequest, 
  ReviewResponse,
  ReviewRecommendation
} from '../types/index.js';

export class ReviewRepository {
  // Create a new review
  static async create(reviewerId: string, reviewData: CreateReviewRequest): Promise<ReviewResponse> {
    const query = `
      INSERT INTO reviews (
        submission_id, reviewer_id, score, comments, recommendation, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      reviewData.submissionId,
      reviewerId,
      reviewData.score,
      reviewData.comments,
      reviewData.recommendation,
      true
    ];

    const result = await Database.query(query, values);
    return this.mapRowToReviewResponse(result.rows[0]);
  }

  // Find review by ID
  static async findById(id: string): Promise<Review | null> {
    const query = 'SELECT * FROM reviews WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReview(result.rows[0]);
  }

  // Find reviews by submission ID
  static async findBySubmissionId(submissionId: string): Promise<ReviewResponse[]> {
    const query = 'SELECT * FROM reviews WHERE submission_id = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [submissionId]);
    return result.rows.map(this.mapRowToReviewResponse);
  }

  // Find reviews by reviewer ID
  static async findByReviewerId(reviewerId: string): Promise<ReviewResponse[]> {
    const query = 'SELECT * FROM reviews WHERE reviewer_id = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [reviewerId]);
    return result.rows.map(this.mapRowToReviewResponse);
  }

  // Update review
  static async update(id: string, updateData: UpdateReviewRequest): Promise<ReviewResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.findByIdAsResponse(id);
    }

    fields.push('is_completed = true');
    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE reviews 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await Database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReviewResponse(result.rows[0]);
  }

  // Check if reviewer is assigned to submission
  static async isReviewerAssigned(submissionId: string, reviewerId: string): Promise<boolean> {
    const query = 'SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2';
    const result = await Database.query(query, [submissionId, reviewerId]);
    return result.rows.length > 0;
  }

  // Assign reviewer to submission (create empty review)
  static async assignReviewer(submissionId: string, reviewerId: string): Promise<ReviewResponse> {
    const query = `
      INSERT INTO reviews (submission_id, reviewer_id, is_completed)
      VALUES ($1, $2, false)
      RETURNING *
    `;

    const result = await Database.query(query, [submissionId, reviewerId]);
    return this.mapRowToReviewResponse(result.rows[0]);
  }

  // Get average score for submission
  static async getAverageScore(submissionId: string): Promise<number | null> {
    const query = `
      SELECT AVG(score) as average_score 
      FROM reviews 
      WHERE submission_id = $1 AND is_completed = true AND score IS NOT NULL
    `;
    const result = await Database.query(query, [submissionId]);
    
    const avgScore = result.rows[0]?.average_score;
    return avgScore ? parseFloat(avgScore) : null;
  }

  // Get review statistics for submission
  static async getSubmissionReviewStats(submissionId: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    averageScore: number | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_reviews,
        AVG(CASE WHEN is_completed = true THEN score END) as average_score
      FROM reviews 
      WHERE submission_id = $1
    `;
    const result = await Database.query(query, [submissionId]);
    const row = result.rows[0];

    return {
      totalReviews: parseInt(row.total_reviews),
      completedReviews: parseInt(row.completed_reviews),
      averageScore: row.average_score ? parseFloat(row.average_score) : null,
    };
  }

  // Get reviewer assignments with submission details
  static async getReviewerAssignments(reviewerId: string): Promise<any[]> {
    const query = `
      SELECT 
        r.id as review_id,
        r.submission_id,
        r.is_completed,
        r.created_at as assigned_date,
        s.title as submission_title,
        s.session_type,
        s.presentation_type,
        s.status as submission_status,
        u.first_name || ' ' || u.last_name as author_name
      FROM reviews r
      JOIN submissions s ON r.submission_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await Database.query(query, [reviewerId]);
    return result.rows.map(row => ({
      reviewId: row.review_id,
      submissionId: row.submission_id,
      submissionTitle: row.submission_title,
      sessionType: row.session_type,
      presentationType: row.presentation_type,
      submissionStatus: row.submission_status,
      authorName: row.author_name,
      assignedDate: row.assigned_date,
      isCompleted: row.is_completed
    }));
  }

  // Get all assignments (admin view)
  static async getAllAssignments(): Promise<any[]> {
    const query = `
      SELECT 
        r.id as review_id,
        r.submission_id,
        r.reviewer_id,
        r.is_completed,
        r.created_at as assigned_date,
        s.title as submission_title,
        s.session_type,
        s.presentation_type,
        s.status as submission_status,
        reviewer.first_name || ' ' || reviewer.last_name as reviewer_name,
        reviewer.expertise,
        author.first_name || ' ' || author.last_name as author_name
      FROM reviews r
      JOIN submissions s ON r.submission_id = s.id
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      JOIN users author ON s.user_id = author.id
      ORDER BY r.created_at DESC
    `;
    
    const result = await Database.query(query);
    return result.rows.map(row => ({
      reviewId: row.review_id,
      submissionId: row.submission_id,
      reviewerId: row.reviewer_id,
      submissionTitle: row.submission_title,
      sessionType: row.session_type,
      presentationType: row.presentation_type,
      submissionStatus: row.submission_status,
      reviewerName: row.reviewer_name,
      reviewerExpertise: row.expertise,
      authorName: row.author_name,
      assignedDate: row.assigned_date,
      isCompleted: row.is_completed
    }));
  }

  // Get assignment suggestions based on expertise
  static async getAssignmentSuggestions(submissionId: string): Promise<any[]> {
    const query = `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.expertise,
        u.affiliation,
        s.session_type,
        s.keywords,
        CASE 
          WHEN u.expertise && s.keywords THEN 3
          WHEN u.expertise && ARRAY[s.session_type::text] THEN 2
          ELSE 1
        END as match_score,
        COUNT(r.id) as current_assignments
      FROM users u
      CROSS JOIN submissions s
      LEFT JOIN reviews r ON u.id = r.reviewer_id AND r.is_completed = false
      WHERE u.role = 'reviewer' 
        AND u.is_active = true
        AND s.id = $1
        AND NOT EXISTS (
          SELECT 1 FROM reviews existing_r 
          WHERE existing_r.reviewer_id = u.id 
          AND existing_r.submission_id = $1
        )
      GROUP BY u.id, u.first_name, u.last_name, u.expertise, u.affiliation, s.session_type, s.keywords
      ORDER BY match_score DESC, current_assignments ASC, u.first_name
      LIMIT 10
    `;
    
    const result = await Database.query(query, [submissionId]);
    return result.rows.map(row => ({
      reviewerId: row.id,
      name: row.name,
      expertise: row.expertise,
      affiliation: row.affiliation,
      matchScore: row.match_score,
      currentAssignments: parseInt(row.current_assignments),
      matchReason: this.getMatchReason(row.match_score)
    }));
  }

  // Get review progress for admin monitoring
  static async getReviewProgress(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_reviews,
        COUNT(CASE WHEN is_completed = false THEN 1 END) as pending_reviews,
        ROUND(
          (COUNT(CASE WHEN is_completed = true THEN 1 END)::decimal / COUNT(*)) * 100, 
          2
        ) as completion_percentage,
        COUNT(DISTINCT submission_id) as submissions_under_review,
        COUNT(DISTINCT reviewer_id) as active_reviewers
      FROM reviews
    `;
    
    const result = await Database.query(query);
    const stats = result.rows[0];

    // Get submissions by review status
    const submissionStatusQuery = `
      SELECT 
        s.status,
        COUNT(*) as count
      FROM submissions s
      WHERE s.status IN ('submitted', 'under_review')
      GROUP BY s.status
    `;
    
    const statusResult = await Database.query(submissionStatusQuery);
    const submissionsByStatus: Record<string, number> = {};
    statusResult.rows.forEach((row: any) => {
      submissionsByStatus[row.status] = parseInt(row.count);
    });

    // Get reviewer workload
    const workloadQuery = `
      SELECT 
        u.first_name || ' ' || u.last_name as reviewer_name,
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN r.is_completed = true THEN 1 END) as completed_reviews,
        COUNT(CASE WHEN r.is_completed = false THEN 1 END) as pending_reviews
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_assignments DESC
    `;
    
    const workloadResult = await Database.query(workloadQuery);
    const reviewerWorkload = workloadResult.rows.map((row: any) => ({
      reviewerName: row.reviewer_name,
      totalAssignments: parseInt(row.total_assignments),
      completedReviews: parseInt(row.completed_reviews),
      pendingReviews: parseInt(row.pending_reviews),
      completionRate: row.total_assignments > 0 ? 
        Math.round((row.completed_reviews / row.total_assignments) * 100) : 0
    }));

    return {
      totalAssignments: parseInt(stats.total_assignments),
      completedReviews: parseInt(stats.completed_reviews),
      pendingReviews: parseInt(stats.pending_reviews),
      completionPercentage: parseFloat(stats.completion_percentage) || 0,
      submissionsUnderReview: parseInt(stats.submissions_under_review),
      activeReviewers: parseInt(stats.active_reviewers),
      submissionsByStatus,
      reviewerWorkload
    };
  }

  // Delete review
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM reviews WHERE id = $1';
    const result = await Database.query(query, [id]);
    return result.rowCount > 0;
  }

  // Helper methods
  private static async findByIdAsResponse(id: string): Promise<ReviewResponse | null> {
    const review = await this.findById(id);
    return review ? this.mapReviewToResponse(review) : null;
  }

  private static mapRowToReview(row: any): Review {
    return {
      id: row.id,
      submissionId: row.submission_id,
      reviewerId: row.reviewer_id,
      score: row.score,
      comments: row.comments,
      recommendation: row.recommendation,
      reviewDate: row.review_date,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToReviewResponse(row: any): ReviewResponse {
    return {
      id: row.id,
      submissionId: row.submission_id,
      reviewerId: row.reviewer_id,
      score: row.score,
      comments: row.comments,
      recommendation: row.recommendation,
      reviewDate: row.review_date,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapReviewToResponse(review: Review): ReviewResponse {
    return {
      id: review.id,
      submissionId: review.submissionId,
      reviewerId: review.reviewerId,
      score: review.score,
      comments: review.comments,
      recommendation: review.recommendation,
      reviewDate: review.reviewDate,
      isCompleted: review.isCompleted,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private static getMatchReason(score: number): string {
    switch (score) {
      case 3:
        return 'Expertise matches submission keywords';
      case 2:
        return 'Expertise matches session type';
      default:
        return 'Available reviewer';
    }
  }

  private static camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}