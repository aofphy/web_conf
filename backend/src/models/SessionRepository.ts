import { Database } from '../database/connection.js';
import { 
  Session, 
  SessionResponse, 
  SessionScheduleResponse,
  SessionType 
} from '../types/index.js';

export class SessionRepository {
  // Create a new session
  static async create(conferenceId: string, sessionData: {
    type: SessionType;
    name: string;
    description?: string;
  }): Promise<SessionResponse> {
    const query = `
      INSERT INTO sessions (conference_id, type, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      conferenceId,
      sessionData.type,
      sessionData.name,
      sessionData.description || null
    ];

    const result = await Database.query(query, values);
    const session = this.mapRowToSession(result.rows[0]);
    
    // Get schedules (will be empty for new session)
    const schedules = await this.getSessionSchedules(session.id);
    
    return this.mapSessionToResponse(session, schedules);
  }

  // Find session by ID
  static async findById(id: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  }

  // Update session
  static async update(id: string, updateData: {
    type?: SessionType;
    name?: string;
    description?: string;
  }): Promise<SessionResponse | null> {
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
      return this.findByIdWithSchedules(id);
    }

    const query = `
      UPDATE sessions 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await Database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    const session = this.mapRowToSession(result.rows[0]);
    const schedules = await this.getSessionSchedules(session.id);
    
    return this.mapSessionToResponse(session, schedules);
  }

  // Delete session
  static async delete(id: string): Promise<boolean> {
    const client = await Database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete session schedules first
      await client.query('DELETE FROM session_schedules WHERE session_id = $1', [id]);
      
      // Delete session
      const result = await client.query('DELETE FROM sessions WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get session schedules
  static async getSessionSchedules(sessionId: string): Promise<SessionScheduleResponse[]> {
    const query = 'SELECT * FROM session_schedules WHERE session_id = $1 ORDER BY start_time';
    const result = await Database.query(query, [sessionId]);
    
    return result.rows.map(this.mapRowToSessionSchedule);
  }

  // Add schedule to session
  static async addSchedule(sessionId: string, scheduleData: {
    startTime: Date;
    endTime: Date;
    location?: string;
    description?: string;
  }): Promise<SessionScheduleResponse> {
    const query = `
      INSERT INTO session_schedules (session_id, start_time, end_time, location, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      sessionId,
      scheduleData.startTime,
      scheduleData.endTime,
      scheduleData.location || null,
      scheduleData.description || null
    ];

    const result = await Database.query(query, values);
    return this.mapRowToSessionSchedule(result.rows[0]);
  }

  // Update session schedule
  static async updateSchedule(scheduleId: string, updateData: {
    startTime?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
  }): Promise<SessionScheduleResponse | null> {
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
      const query = 'SELECT * FROM session_schedules WHERE id = $1';
      const result = await Database.query(query, [scheduleId]);
      return result.rows.length > 0 ? this.mapRowToSessionSchedule(result.rows[0]) : null;
    }

    const query = `
      UPDATE session_schedules 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(scheduleId);

    const result = await Database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSessionSchedule(result.rows[0]);
  }

  // Delete session schedule
  static async deleteSchedule(scheduleId: string): Promise<boolean> {
    const query = 'DELETE FROM session_schedules WHERE id = $1';
    const result = await Database.query(query, [scheduleId]);
    
    return (result.rowCount ?? 0) > 0;
  }

  // Find sessions by conference ID
  static async findByConferenceId(conferenceId: string): Promise<SessionResponse[]> {
    const query = 'SELECT * FROM sessions WHERE conference_id = $1 ORDER BY type';
    const result = await Database.query(query, [conferenceId]);
    
    const sessions: SessionResponse[] = [];
    for (const row of result.rows) {
      const session = this.mapRowToSession(row);
      const schedules = await this.getSessionSchedules(session.id);
      sessions.push(this.mapSessionToResponse(session, schedules));
    }

    return sessions;
  }

  // Helper methods
  private static async findByIdWithSchedules(id: string): Promise<SessionResponse | null> {
    const session = await this.findById(id);
    if (!session) {
      return null;
    }

    const schedules = await this.getSessionSchedules(session.id);
    return this.mapSessionToResponse(session, schedules);
  }

  private static mapRowToSession(row: any): Session {
    return {
      id: row.id,
      conferenceId: row.conference_id,
      type: row.type,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToSessionSchedule(row: any): SessionScheduleResponse {
    return {
      id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      description: row.description,
    };
  }

  private static mapSessionToResponse(session: Session, schedules: SessionScheduleResponse[]): SessionResponse {
    return {
      id: session.id,
      type: session.type,
      name: session.name,
      description: session.description,
      schedules,
    };
  }

  private static camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}