import { Database } from '../database/connection.js';
import { PaymentInstructionsResponse } from '../types/index.js';

export class PaymentInstructionsRepository {
  // Create or update payment instructions
  static async upsert(conferenceId: string, instructionsData: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    swiftCode?: string;
    routingNumber?: string;
    acceptedMethods: string[];
    instructions: string;
    supportContact?: string;
  }): Promise<PaymentInstructionsResponse> {
    const query = `
      INSERT INTO payment_instructions (
        conference_id, bank_name, account_name, account_number, 
        swift_code, routing_number, accepted_methods, instructions, support_contact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (conference_id) 
      DO UPDATE SET
        bank_name = EXCLUDED.bank_name,
        account_name = EXCLUDED.account_name,
        account_number = EXCLUDED.account_number,
        swift_code = EXCLUDED.swift_code,
        routing_number = EXCLUDED.routing_number,
        accepted_methods = EXCLUDED.accepted_methods,
        instructions = EXCLUDED.instructions,
        support_contact = EXCLUDED.support_contact,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      conferenceId,
      instructionsData.bankName,
      instructionsData.accountName,
      instructionsData.accountNumber,
      instructionsData.swiftCode || null,
      instructionsData.routingNumber || null,
      instructionsData.acceptedMethods,
      instructionsData.instructions,
      instructionsData.supportContact || null
    ];

    const result = await Database.query(query, values);
    return this.mapRowToPaymentInstructions(result.rows[0]);
  }

  // Find payment instructions by conference ID
  static async findByConferenceId(conferenceId: string): Promise<PaymentInstructionsResponse | null> {
    const query = 'SELECT * FROM payment_instructions WHERE conference_id = $1';
    const result = await Database.query(query, [conferenceId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentInstructions(result.rows[0]);
  }

  // Get active payment instructions (from active conference)
  static async getActive(): Promise<PaymentInstructionsResponse | null> {
    const query = `
      SELECT pi.* FROM payment_instructions pi
      JOIN conferences c ON pi.conference_id = c.id
      WHERE c.is_active = true
      LIMIT 1
    `;
    const result = await Database.query(query);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentInstructions(result.rows[0]);
  }

  // Delete payment instructions
  static async delete(conferenceId: string): Promise<boolean> {
    const query = 'DELETE FROM payment_instructions WHERE conference_id = $1';
    const result = await Database.query(query, [conferenceId]);
    
    return result.rowCount > 0;
  }

  // Helper methods
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
}