import { Database } from '../database/connection.js';
import { 
  Conference, 
  Session, 
  CreateConferenceRequest, 
  UpdateConferenceRequest, 
  ConferenceResponse,
  SessionResponse,
  RegistrationFeeResponse,
  PaymentInstructionsResponse,
  ParticipantType
} from '../types/index.js';

export class ConferenceRepository {
  // Create a new conference
  static async create(conferenceData: CreateConferenceRequest): Promise<ConferenceResponse> {
    const query = `
      INSERT INTO conferences (
        name, description, start_date, end_date, venue, 
        registration_deadline, submission_deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      conferenceData.name,
      conferenceData.description || null,
      conferenceData.startDate,
      conferenceData.endDate,
      conferenceData.venue,
      conferenceData.registrationDeadline,
      conferenceData.submissionDeadline
    ];

    const result = await Database.query(query, values);
    const conference = this.mapRowToConference(result.rows[0]);
    
    return this.mapConferenceToResponse(conference, [], [], null);
  }

  // Find conference by ID
  static async findById(id: string): Promise<Conference | null> {
    const query = 'SELECT * FROM conferences WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConference(result.rows[0]);
  }

  // Find active conference with all related data
  static async findActiveConference(): Promise<ConferenceResponse | null> {
    const query = 'SELECT * FROM conferences WHERE is_active = true ORDER BY created_at DESC LIMIT 1';
    const result = await Database.query(query);
    
    if (result.rows.length === 0) {
      return null;
    }

    const conference = this.mapRowToConference(result.rows[0]);
    const sessions = await this.getConferenceSessions(conference.id);
    const registrationFees = await this.getRegistrationFees(conference.id);
    const paymentInstructions = await this.getPaymentInstructions(conference.id);

    return this.mapConferenceToResponse(conference, sessions, registrationFees, paymentInstructions);
  }

  // Update conference
  static async update(id: string, updateData: UpdateConferenceRequest): Promise<ConferenceResponse | null> {
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
      return this.findByIdWithDetails(id);
    }

    const query = `
      UPDATE conferences 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await Database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    const conference = this.mapRowToConference(result.rows[0]);
    const sessions = await this.getConferenceSessions(conference.id);
    const registrationFees = await this.getRegistrationFees(conference.id);
    const paymentInstructions = await this.getPaymentInstructions(conference.id);

    return this.mapConferenceToResponse(conference, sessions, registrationFees, paymentInstructions);
  }

  // Get conference sessions
  static async getConferenceSessions(conferenceId: string): Promise<SessionResponse[]> {
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

  // Get session schedules
  static async getSessionSchedules(sessionId: string): Promise<any[]> {
    const query = 'SELECT * FROM session_schedules WHERE session_id = $1 ORDER BY start_time';
    const result = await Database.query(query, [sessionId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      description: row.description,
    }));
  }

  // Get registration fees
  static async getRegistrationFees(conferenceId: string): Promise<RegistrationFeeResponse[]> {
    const query = 'SELECT * FROM registration_fees WHERE conference_id = $1 ORDER BY participant_type';
    const result = await Database.query(query, [conferenceId]);
    return result.rows.map(this.mapRowToRegistrationFee);
  }

  // Get payment instructions
  static async getPaymentInstructions(conferenceId: string): Promise<PaymentInstructionsResponse | null> {
    const query = 'SELECT * FROM payment_instructions WHERE conference_id = $1 LIMIT 1';
    const result = await Database.query(query, [conferenceId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentInstructions(result.rows[0]);
  }

  // Get registration fee for participant type
  static async getRegistrationFeeForParticipant(
    conferenceId: string, 
    participantType: ParticipantType
  ): Promise<RegistrationFeeResponse | null> {
    const query = `
      SELECT * FROM registration_fees 
      WHERE conference_id = $1 AND participant_type = $2
    `;
    const result = await Database.query(query, [conferenceId, participantType]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRegistrationFee(result.rows[0]);
  }

  // Create or update registration fee
  static async upsertRegistrationFee(
    conferenceId: string,
    participantType: ParticipantType,
    feeData: {
      earlyBirdFee: number;
      regularFee: number;
      lateFee: number;
      currency: string;
      earlyBirdDeadline: Date;
      lateRegistrationStart: Date;
    }
  ): Promise<RegistrationFeeResponse> {
    const query = `
      INSERT INTO registration_fees (
        conference_id, participant_type, early_bird_fee, regular_fee, late_fee,
        currency, early_bird_deadline, late_registration_start
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (conference_id, participant_type) 
      DO UPDATE SET
        early_bird_fee = EXCLUDED.early_bird_fee,
        regular_fee = EXCLUDED.regular_fee,
        late_fee = EXCLUDED.late_fee,
        currency = EXCLUDED.currency,
        early_bird_deadline = EXCLUDED.early_bird_deadline,
        late_registration_start = EXCLUDED.late_registration_start
      RETURNING *
    `;

    const values = [
      conferenceId,
      participantType,
      feeData.earlyBirdFee,
      feeData.regularFee,
      feeData.lateFee,
      feeData.currency,
      feeData.earlyBirdDeadline,
      feeData.lateRegistrationStart
    ];

    const result = await Database.query(query, values);
    return this.mapRowToRegistrationFee(result.rows[0]);
  }

  // Helper methods
  private static async findByIdWithDetails(id: string): Promise<ConferenceResponse | null> {
    const conference = await this.findById(id);
    if (!conference) {
      return null;
    }

    const sessions = await this.getConferenceSessions(conference.id);
    const registrationFees = await this.getRegistrationFees(conference.id);
    const paymentInstructions = await this.getPaymentInstructions(conference.id);

    return this.mapConferenceToResponse(conference, sessions, registrationFees, paymentInstructions);
  }

  private static mapRowToConference(row: any): Conference {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      venue: row.venue,
      registrationDeadline: row.registration_deadline,
      submissionDeadline: row.submission_deadline,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

  private static mapRowToRegistrationFee(row: any): RegistrationFeeResponse {
    return {
      id: row.id,
      participantType: row.participant_type,
      earlyBirdFee: parseFloat(row.early_bird_fee),
      regularFee: parseFloat(row.regular_fee),
      lateFee: parseFloat(row.late_fee),
      currency: row.currency,
      earlyBirdDeadline: row.early_bird_deadline,
      lateRegistrationStart: row.late_registration_start,
    };
  }

  private static mapRowToPaymentInstructions(row: any): PaymentInstructionsResponse {
    return {
      id: row.id,
      bankName: row.bank_name,
      accountName: row.account_name,
      accountNumber: row.account_number,
      swiftCode: row.swift_code,
      routingNumber: row.routing_number,
      acceptedMethods: row.accepted_methods || [],
      instructions: row.instructions,
      supportContact: row.support_contact,
    };
  }

  private static mapConferenceToResponse(
    conference: Conference,
    sessions: SessionResponse[],
    registrationFees: RegistrationFeeResponse[],
    paymentInstructions: PaymentInstructionsResponse | null
  ): ConferenceResponse {
    return {
      id: conference.id,
      name: conference.name,
      description: conference.description,
      startDate: conference.startDate,
      endDate: conference.endDate,
      venue: conference.venue,
      registrationDeadline: conference.registrationDeadline,
      submissionDeadline: conference.submissionDeadline,
      isActive: conference.isActive,
      sessions,
      registrationFees,
      paymentInstructions: paymentInstructions || undefined,
      createdAt: conference.createdAt,
      updatedAt: conference.updatedAt,
    };
  }

  private static mapSessionToResponse(session: Session, schedules: any[]): SessionResponse {
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