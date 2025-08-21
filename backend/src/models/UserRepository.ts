import { PoolClient } from 'pg';
import { Database } from '../database/connection.js';
import { 
  User, 
  UserSession, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserResponse,
  SessionType,
  ParticipantType,
  UserRole,
  PaymentStatus
} from '../types/index.js';

export class UserRepository {
  // Create a new user
  static async create(userData: CreateUserRequest & { passwordHash: string }): Promise<User> {
    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, affiliation, country,
        participant_type, bio, expertise, registration_fee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.affiliation,
      userData.country,
      userData.participantType,
      userData.bio || null,
      userData.expertise || [],
      0 // Will be calculated based on participant type and conference fees
    ];

    return Database.transaction(async (client: PoolClient) => {
      const result = await client.query(query, values);
      const user = this.mapRowToUser(result.rows[0]);

      // Insert selected sessions
      if (userData.selectedSessions && userData.selectedSessions.length > 0) {
        await this.addUserSessions(client, user.id, userData.selectedSessions);
      }

      return user;
    });
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await Database.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Update user
  static async update(id: string, updateData: UpdateUserRequest): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'selectedSessions') {
        const dbField = this.camelToSnakeCase(key);
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0 && !updateData.selectedSessions) {
      const user = await this.findById(id);
      return user;
    }

    return Database.transaction(async (client: PoolClient) => {
      let user: User | null = null;

      // Update user fields if any
      if (fields.length > 0) {
        const query = `
          UPDATE users 
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount} AND is_active = true
          RETURNING *
        `;
        values.push(id);

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return null;
        }
        user = this.mapRowToUser(result.rows[0]);
      }

      // Update selected sessions if provided
      if (updateData.selectedSessions) {
        await this.updateUserSessions(client, id, updateData.selectedSessions);
        if (!user) {
          user = await this.findById(id);
        }
      }

      return user;
    });
  }

  // Get user with selected sessions
  static async findByIdWithSessions(id: string): Promise<UserResponse | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    const sessions = await this.getUserSessions(id);
    return this.mapUserToResponse(user, sessions);
  }

  // Get user sessions
  static async getUserSessions(userId: string): Promise<SessionType[]> {
    const query = 'SELECT session_type FROM user_sessions WHERE user_id = $1';
    const result = await Database.query(query, [userId]);
    return result.rows.map(row => row.session_type);
  }

  // Add user sessions
  private static async addUserSessions(client: PoolClient, userId: string, sessions: SessionType[]): Promise<void> {
    if (sessions.length === 0) return;

    const values = sessions.map((session, index) => 
      `($1, $${index + 2})`
    ).join(', ');

    const query = `
      INSERT INTO user_sessions (user_id, session_type) 
      VALUES ${values}
      ON CONFLICT (user_id, session_type) DO NOTHING
    `;

    await client.query(query, [userId, ...sessions]);
  }

  // Update user sessions (replace all)
  private static async updateUserSessions(client: PoolClient, userId: string, sessions: SessionType[]): Promise<void> {
    // Delete existing sessions
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    
    // Add new sessions
    if (sessions.length > 0) {
      await this.addUserSessions(client, userId, sessions);
    }
  }

  // Update payment status
  static async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<User | null> {
    const query = `
      UPDATE users 
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await Database.query(query, [paymentStatus, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Update user role
  static async updateRole(id: string, role: UserRole): Promise<User | null> {
    const query = `
      UPDATE users 
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await Database.query(query, [role, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Deactivate user (soft delete)
  static async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await Database.query(query, [id]);
    return result.rowCount > 0;
  }

  // Get users by role
  static async findByRole(role: UserRole): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE role = $1 AND is_active = true ORDER BY created_at DESC';
    const result = await Database.query(query, [role]);
    return result.rows.map(this.mapRowToUser);
  }

  // Get users by participant type
  static async findByParticipantType(participantType: ParticipantType): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE participant_type = $1 AND is_active = true ORDER BY created_at DESC';
    const result = await Database.query(query, [participantType]);
    return result.rows.map(this.mapRowToUser);
  }

  // Update user password
  static async updatePassword(id: string, passwordHash: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await Database.query(query, [passwordHash, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Helper methods
  static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      affiliation: row.affiliation,
      country: row.country,
      participantType: row.participant_type,
      role: row.role,
      registrationDate: row.registration_date,
      isActive: row.is_active,
      bio: row.bio,
      expertise: row.expertise || [],
      paymentStatus: row.payment_status,
      registrationFee: parseFloat(row.registration_fee),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static mapUserToResponse(user: User, sessions: SessionType[]): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      affiliation: user.affiliation,
      country: user.country,
      participantType: user.participantType,
      role: user.role,
      registrationDate: user.registrationDate,
      isActive: user.isActive,
      bio: user.bio,
      expertise: user.expertise,
      paymentStatus: user.paymentStatus,
      registrationFee: user.registrationFee,
      selectedSessions: sessions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private static camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}