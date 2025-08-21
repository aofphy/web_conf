import { BaseEntity, PaymentMethod, PaymentRecordStatus } from './database.js';

export interface PaymentRecord extends BaseEntity {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  proofOfPaymentPath?: string;
  transactionReference?: string;
  paymentDate: Date;
  status: PaymentRecordStatus;
  adminNotes?: string;
  verifiedBy?: string;
  verificationDate?: Date;
}

// DTOs for API requests/responses
export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentRecordStatus;
  adminNotes?: string;
}

export interface PaymentResponse {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  proofOfPaymentPath?: string;
  transactionReference?: string;
  paymentDate: Date;
  status: PaymentRecordStatus;
  adminNotes?: string;
  verifiedBy?: string;
  verificationDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PaymentProofUploadRequest {
  paymentId: string;
  file: Express.Multer.File;
}

export interface PaymentVerificationRequest {
  paymentId: string;
  status: 'verified' | 'rejected';
  adminNotes?: string;
}