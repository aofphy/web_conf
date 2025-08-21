import { PoolClient } from 'pg';
import { Database } from '../database/connection.js';
import { 
  Submission, 
  Author, 
  CreateSubmissionRequest, 
  UpdateSubmissionRequest, 
  SubmissionResponse,
  AuthorResponse,
  SessionType,
  PresentationType,
  SubmissionStatus
} from '../types/index.js';

export class SubmissionRepository {
  // Create a new submission
  async create(submissionData: Omit<Submission, 'updatedAt'>): Promise<Submission> {
    const query = `
      INSERT INTO submissions (
        id, user_id, title, abstract, abstract_html, keywords, 
        session_type, presentation_type, status, submission_date,
        corresponding_author, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      submissionData.id,
      submissionData.userId,
      submissionData.title,
      submissionData.abstract,
      submissionData.abstractHtml,
      submissionData.keywords,
      submissionData.sessionType,
      submissionData.presentationType,
      submissionData.status,
      submissionData.submissionDate,
      submissionData.correspondingAuthor,
      submissionData.createdAt
    ];

    const result = await Database.query(query, values);
    return this.mapRowToSubmission(result.rows[0]);
  }

  // Create author
  async createAuthor(authorData: Omit<Author, 'updatedAt'>): Promise<Author> {
    const query = `
      INSERT INTO authors (
        id, submission_id, name, affiliation, email, 
        is_corresponding, author_order, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      authorData.id,
      authorData.submissionId,
      authorData.name,
      authorData.affiliation,
      authorData.email,
      authorData.isCorresponding,
      authorData.authorOrder,
      authorData.createdAt
    ];

    const result = await Database.query(query, values);
    return this.mapRowToAuthor(result.rows[0]);
  }

  // Create a new submission with authors (legacy method)
  static async create(userId: string, submissionData: CreateSubmissionRequest): Promise<SubmissionResponse> {
    return Database.transaction(async (client: PoolClient) => {
      // Insert submission
      const submissionQuery = `
        INSERT INTO submissions (
          user_id, title, abstract, keywords, session_type, 
          presentation_type, corresponding_author
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const submissionValues = [
        userId,
        submissionData.title,
        submissionData.abstract,
        submissionData.keywords,
        submissionData.sessionType,
        submissionData.presentationType,
        submissionData.correspondingAuthor
      ];

      const submissionResult = await client.query(submissionQuery, submissionValues);
      const submission = this.mapRowToSubmission(submissionResult.rows[0]);

      // Insert authors
      const authors = await this.createAuthors(client, submission.id, submissionData.authors);

      return this.mapSubmissionToResponse(submission, authors);
    });
  }

  // Find submission by ID
  async findById(id: string): Promise<Submission | null> {
    const query = 'SELECT * FROM submissions WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Find submission by ID (static version for backward compatibility)
  static async findById(id: string): Promise<Submission | null> {
    const query = 'SELECT * FROM submissions WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Find submission by ID with authors
  async findByIdWithAuthors(id: string): Promise<SubmissionResponse | null> {
    const submission = await this.findById(id);
    if (!submission) {
      return null;
    }

    const authors = await this.getSubmissionAuthors(id);
    return this.mapSubmissionToResponse(submission, authors);
  }

  // Find submission by ID with authors (static version)
  static async findByIdWithAuthors(id: string): Promise<SubmissionResponse | null> {
    const submission = await this.findById(id);
    if (!submission) {
      return null;
    }

    const authors = await this.getSubmissionAuthors(id);
    return this.mapSubmissionToResponse(submission, authors);
  }

  // Find submissions by user ID
  async findByUserId(userId: string): Promise<SubmissionResponse[]> {
    const query = 'SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [userId]);
    
    const submissions = result.rows.map(row => this.mapRowToSubmission(row));
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return submissionResponses;
  }

  // Find submissions by user ID (static version)
  static async findByUserId(userId: string): Promise<SubmissionResponse[]> {
    const query = 'SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [userId]);
    
    const submissions = result.rows.map(this.mapRowToSubmission);
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return submissionResponses;
  }

  // Find submissions by session type
  static async findBySessionType(sessionType: SessionType): Promise<SubmissionResponse[]> {
    const query = 'SELECT * FROM submissions WHERE session_type = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [sessionType]);
    
    const submissions = result.rows.map(this.mapRowToSubmission);
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return submissionResponses;
  }

  // Find submissions by status
  static async findByStatus(status: SubmissionStatus): Promise<SubmissionResponse[]> {
    const query = 'SELECT * FROM submissions WHERE status = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [status]);
    
    const submissions = result.rows.map(this.mapRowToSubmission);
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return submissionResponses;
  }

  // Delete authors by submission ID
  async deleteAuthorsBySubmissionId(submissionId: string): Promise<void> {
    const query = 'DELETE FROM authors WHERE submission_id = $1';
    await Database.query(query, [submissionId]);
  }

  // Update submission
  async update(id: string, updateData: Partial<Submission>): Promise<Submission | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        const dbField = this.camelToSnakeCase(key);
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE submissions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await Database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Find all submissions with pagination and filters
  async findAll(options: {
    page: number;
    limit: number;
    filters?: { sessionType?: string; status?: string };
  }): Promise<{
    submissions: SubmissionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, filters = {} } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.sessionType) {
      whereConditions.push(`session_type = $${paramCount}`);
      values.push(filters.sessionType);
      paramCount++;
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM submissions ${whereClause}`;
    const countResult = await Database.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get submissions
    const query = `
      SELECT * FROM submissions 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const result = await Database.query(query, values);
    const submissions = result.rows.map(row => this.mapRowToSubmission(row));
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return {
      submissions: submissionResponses,
      total,
      page,
      limit
    };
  }

  // Delete submission
  async delete(id: string): Promise<boolean> {
    return Database.transaction(async (client: PoolClient) => {
      // Delete authors first (due to foreign key constraint)
      await client.query('DELETE FROM authors WHERE submission_id = $1', [id]);
      
      // Delete submission
      const result = await client.query('DELETE FROM submissions WHERE id = $1', [id]);
      return result.rowCount > 0;
    });
  }

  // Get submission statistics
  async getStatistics(): Promise<{
    totalSubmissions: number;
    submissionsByStatus: Record<string, number>;
    submissionsBySession: Record<string, number>;
    submissionsByPresentationType: Record<string, number>;
  }> {
    const totalQuery = 'SELECT COUNT(*) as count FROM submissions';
    const totalResult = await Database.query(totalQuery);
    const totalSubmissions = parseInt(totalResult.rows[0].count);

    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM submissions 
      GROUP BY status
    `;
    const statusResult = await Database.query(statusQuery);
    const submissionsByStatus: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      submissionsByStatus[row.status] = parseInt(row.count);
    });

    const sessionQuery = `
      SELECT session_type, COUNT(*) as count 
      FROM submissions 
      GROUP BY session_type
    `;
    const sessionResult = await Database.query(sessionQuery);
    const submissionsBySession: Record<string, number> = {};
    sessionResult.rows.forEach(row => {
      submissionsBySession[row.session_type] = parseInt(row.count);
    });

    const presentationQuery = `
      SELECT presentation_type, COUNT(*) as count 
      FROM submissions 
      GROUP BY presentation_type
    `;
    const presentationResult = await Database.query(presentationQuery);
    const submissionsByPresentationType: Record<string, number> = {};
    presentationResult.rows.forEach(row => {
      submissionsByPresentationType[row.presentation_type] = parseInt(row.count);
    });

    return {
      totalSubmissions,
      submissionsByStatus,
      submissionsBySession,
      submissionsByPresentationType
    };
  }

  // Get submission authors
  async getSubmissionAuthors(submissionId: string): Promise<AuthorResponse[]> {
    const query = `
      SELECT * FROM authors 
      WHERE submission_id = $1 
      ORDER BY author_order ASC
    `;
    const result = await Database.query(query, [submissionId]);
    return result.rows.map(row => this.mapRowToAuthor(row));
  }

  // Update submission (static version for backward compatibility)
  static async update(id: string, updateData: UpdateSubmissionRequest): Promise<SubmissionResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query (excluding authors)
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'authors') {
        const dbField = this.camelToSnakeCase(key);
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    return Database.transaction(async (client: PoolClient) => {
      let submission: Submission | null = null;

      // Update submission fields if any
      if (fields.length > 0) {
        const query = `
          UPDATE submissions 
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount}
          RETURNING *
        `;
        values.push(id);

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return null;
        }
        submission = this.mapRowToSubmission(result.rows[0]);
      }

      // Update authors if provided
      let authors: AuthorResponse[] = [];
      if (updateData.authors) {
        // Delete existing authors
        await client.query('DELETE FROM authors WHERE submission_id = $1', [id]);
        // Create new authors
        authors = await this.createAuthors(client, id, updateData.authors);
      } else {
        authors = await this.getSubmissionAuthors(id);
      }

      if (!submission) {
        submission = await this.findById(id);
        if (!submission) {
          return null;
        }
      }

      return this.mapSubmissionToResponse(submission, authors);
    });
  }

  // Update submission status
  static async updateStatus(id: string, status: SubmissionStatus): Promise<Submission | null> {
    const query = `
      UPDATE submissions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(query, [status, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Update manuscript path
  static async updateManuscriptPath(id: string, manuscriptPath: string): Promise<Submission | null> {
    const query = `
      UPDATE submissions 
      SET manuscript_path = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(query, [manuscriptPath, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Update abstract HTML (rendered from markdown)
  static async updateAbstractHtml(id: string, abstractHtml: string): Promise<Submission | null> {
    const query = `
      UPDATE submissions 
      SET abstract_html = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(query, [abstractHtml, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Delete submission
  static async delete(id: string): Promise<boolean> {
    return Database.transaction(async (client: PoolClient) => {
      // Delete authors first (due to foreign key constraint)
      await client.query('DELETE FROM authors WHERE submission_id = $1', [id]);
      
      // Delete submission
      const result = await client.query('DELETE FROM submissions WHERE id = $1', [id]);
      return result.rowCount > 0;
    });
  }

  // Get submission authors
  static async getSubmissionAuthors(submissionId: string): Promise<AuthorResponse[]> {
    const query = `
      SELECT * FROM authors 
      WHERE submission_id = $1 
      ORDER BY author_order ASC
    `;
    const result = await Database.query(query, [submissionId]);
    return result.rows.map(this.mapRowToAuthor);
  }

  // Create authors for a submission
  private static async createAuthors(client: PoolClient, submissionId: string, authorsData: any[]): Promise<AuthorResponse[]> {
    if (authorsData.length === 0) return [];

    const values = authorsData.map((author, index) => {
      const baseIndex = index * 6;
      return `($1, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
    }).join(', ');

    const flatValues = [submissionId];
    authorsData.forEach(author => {
      flatValues.push(
        author.name,
        author.affiliation,
        author.email,
        author.isCorresponding,
        author.authorOrder
      );
    });

    const query = `
      INSERT INTO authors (submission_id, name, affiliation, email, is_corresponding, author_order)
      VALUES ${values}
      RETURNING *
    `;

    const result = await client.query(query, flatValues);
    return result.rows.map(this.mapRowToAuthor);
  }

  // Get all submissions (for admin)
  static async findAll(limit: number = 50, offset: number = 0): Promise<SubmissionResponse[]> {
    const query = `
      SELECT * FROM submissions 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await Database.query(query, [limit, offset]);
    
    const submissions = result.rows.map(this.mapRowToSubmission);
    const submissionResponses: SubmissionResponse[] = [];

    for (const submission of submissions) {
      const authors = await this.getSubmissionAuthors(submission.id);
      submissionResponses.push(this.mapSubmissionToResponse(submission, authors));
    }

    return submissionResponses;
  }

  // Count submissions by various criteria
  static async countByStatus(status?: SubmissionStatus): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM submissions';
    const values: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      values.push(status);
    }

    const result = await Database.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Helper methods
  private mapRowToSubmission(row: any): Submission {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      abstract: row.abstract,
      abstractHtml: row.abstract_html,
      keywords: row.keywords || [],
      sessionType: row.session_type,
      presentationType: row.presentation_type,
      status: row.status,
      submissionDate: row.submission_date,
      manuscriptPath: row.manuscript_path,
      correspondingAuthor: row.corresponding_author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToAuthor(row: any): AuthorResponse {
    return {
      id: row.id,
      name: row.name,
      affiliation: row.affiliation,
      email: row.email,
      isCorresponding: row.is_corresponding,
      authorOrder: row.author_order,
    };
  }

  private mapSubmissionToResponse(submission: Submission, authors: AuthorResponse[]): SubmissionResponse {
    return {
      id: submission.id,
      userId: submission.userId,
      title: submission.title,
      abstract: submission.abstract,
      abstractHtml: submission.abstractHtml,
      keywords: submission.keywords,
      sessionType: submission.sessionType,
      presentationType: submission.presentationType,
      status: submission.status,
      submissionDate: submission.submissionDate,
      manuscriptPath: submission.manuscriptPath,
      correspondingAuthor: submission.correspondingAuthor,
      authors: authors,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Static helper methods for backward compatibility
  private static mapRowToSubmission(row: any): Submission {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      abstract: row.abstract,
      abstractHtml: row.abstract_html,
      keywords: row.keywords || [],
      sessionType: row.session_type,
      presentationType: row.presentation_type,
      status: row.status,
      submissionDate: row.submission_date,
      manuscriptPath: row.manuscript_path,
      correspondingAuthor: row.corresponding_author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToAuthor(row: any): AuthorResponse {
    return {
      id: row.id,
      name: row.name,
      affiliation: row.affiliation,
      email: row.email,
      isCorresponding: row.is_corresponding,
      authorOrder: row.author_order,
    };
  }

  private static mapSubmissionToResponse(submission: Submission, authors: AuthorResponse[]): SubmissionResponse {
    return {
      id: submission.id,
      userId: submission.userId,
      title: submission.title,
      abstract: submission.abstract,
      abstractHtml: submission.abstractHtml,
      keywords: submission.keywords,
      sessionType: submission.sessionType,
      presentationType: submission.presentationType,
      status: submission.status,
      submissionDate: submission.submissionDate,
      manuscriptPath: submission.manuscriptPath,
      correspondingAuthor: submission.correspondingAuthor,
      authors: authors,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  private static camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}