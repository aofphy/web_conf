export type PaymentStatus = 'not_paid' | 'payment_submitted' | 'payment_verified' | 'payment_rejected';
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'other';
export type PaymentRecordStatus = 'pending' | 'verified' | 'rejected';

export interface PaymentRecord {
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

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  routingNumber?: string;
}

export interface PaymentInstructions {
  bankDetails: BankDetails;
  acceptedMethods: string[];
  instructions: string;
  supportContact?: string;
}

export interface PaymentInfo {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    participantType: string;
    registrationFee: number;
    paymentStatus: PaymentStatus;
  };
  paymentInstructions: PaymentInstructions;
  paymentRecords: PaymentRecord[];
  latestPayment?: PaymentRecord;
}

export interface PaymentStatusInfo {
  paymentStatus: PaymentStatus;
  registrationFee: number;
  paymentRecords: PaymentRecord[];
  latestPayment?: PaymentRecord;
  canSubmitPayment: boolean;
}

export interface SubmitPaymentProofRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  proofFile: File;
}

export interface PaymentResponse {
  success: boolean;
  data?: PaymentRecord;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}