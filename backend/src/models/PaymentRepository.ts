import { Database } from '../database/connection.js';
import { 
  PaymentRecord, 
  CreatePaymentRequest, 
  PaymentResponse,
  PaymentRecordStatus
} from '../types/index.js';

export class PaymentRepository {
  // Create a new payment record
  static async create(userId: string, paymentData: CreatePaymentRequest): Promise<PaymentResponse> {
    const query = `
      INSERT INTO payment_records (
        user_id, amount, currency, payment_method, transaction_reference
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      userId,
      paymentData.amount,
      paymentData.currency,
      paymentData.paymentMethod,
      paymentData.transactionReference || null
    ];

    const result = await Database.query(query, values);
    return this.mapRowToPaymentResponse(result.rows[0]);
  }

  // Find payment by ID
  static async findById(id: string): Promise<PaymentRecord | null> {
    const query = 'SELECT * FROM payment_records WHERE id = $1';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPayment(result.rows[0]);
  }

  // Find payments by user ID
  static async findByUserId(userId: string): Promise<PaymentResponse[]> {
    const query = 'SELECT * FROM payment_records WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [userId]);
    return result.rows.map(this.mapRowToPaymentResponse);
  }

  // Find payments by status
  static async findByStatus(status: PaymentRecordStatus): Promise<PaymentResponse[]> {
    const query = 'SELECT * FROM payment_records WHERE status = $1 ORDER BY created_at DESC';
    const result = await Database.query(query, [status]);
    return result.rows.map(this.mapRowToPaymentResponse);
  }

  // Update payment status
  static async updateStatus(
    id: string, 
    status: PaymentRecordStatus, 
    verifiedBy?: string, 
    adminNotes?: string
  ): Promise<PaymentResponse | null> {
    const query = `
      UPDATE payment_records 
      SET 
        status = $1, 
        verified_by = $2, 
        verification_date = CASE WHEN $1 IN ('verified', 'rejected') THEN CURRENT_TIMESTAMP ELSE verification_date END,
        admin_notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await Database.query(query, [status, verifiedBy || null, adminNotes || null, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentResponse(result.rows[0]);
  }

  // Update proof of payment path
  static async updateProofPath(id: string, proofPath: string): Promise<PaymentResponse | null> {
    const query = `
      UPDATE payment_records 
      SET proof_of_payment_path = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(query, [proofPath, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentResponse(result.rows[0]);
  }

  // Get latest payment for user
  static async getLatestByUserId(userId: string): Promise<PaymentResponse | null> {
    const query = `
      SELECT * FROM payment_records 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await Database.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentResponse(result.rows[0]);
  }

  // Get pending payments for admin review
  static async getPendingPayments(): Promise<PaymentResponse[]> {
    const query = `
      SELECT pr.*, u.first_name, u.last_name, u.email, u.participant_type
      FROM payment_records pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC
    `;
    const result = await Database.query(query);
    return result.rows.map((row: any) => ({
      ...this.mapRowToPaymentResponse(row),
      userInfo: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        participantType: row.participant_type,
      }
    }));
  }

  // Count payments by status
  static async countByStatus(status?: PaymentRecordStatus): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM payment_records';
    const values: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      values.push(status);
    }

    const result = await Database.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Get payment statistics
  static async getPaymentStats(): Promise<{
    totalPayments: number;
    pendingPayments: number;
    verifiedPayments: number;
    rejectedPayments: number;
    totalAmount: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_payments,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_payments,
        COALESCE(SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END), 0) as total_amount
      FROM payment_records
    `;
    const result = await Database.query(query);
    const row = result.rows[0];

    return {
      totalPayments: parseInt(row.total_payments),
      pendingPayments: parseInt(row.pending_payments),
      verifiedPayments: parseInt(row.verified_payments),
      rejectedPayments: parseInt(row.rejected_payments),
      totalAmount: parseFloat(row.total_amount),
    };
  }

  // Delete payment record
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM payment_records WHERE id = $1';
    const result = await Database.query(query, [id]);
    return result.rowCount > 0;
  }

  // Helper methods
  private static mapRowToPayment(row: any): PaymentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethod: row.payment_method,
      proofOfPaymentPath: row.proof_of_payment_path,
      transactionReference: row.transaction_reference,
      paymentDate: row.payment_date,
      status: row.status,
      adminNotes: row.admin_notes,
      verifiedBy: row.verified_by,
      verificationDate: row.verification_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToPaymentResponse(row: any): PaymentResponse {
    return {
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethod: row.payment_method,
      proofOfPaymentPath: row.proof_of_payment_path,
      transactionReference: row.transaction_reference,
      paymentDate: row.payment_date,
      status: row.status,
      adminNotes: row.admin_notes,
      verifiedBy: row.verified_by,
      verificationDate: row.verification_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}