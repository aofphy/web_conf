import { PaymentRecord } from '../types/payment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface PaymentStatistics {
  totalPayments: number;
  pendingPayments: number;
  verifiedPayments: number;
  rejectedPayments: number;
  totalAmount: number;
}

export interface PendingPaymentWithUser extends PaymentRecord {
  userInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    participantType: string;
  };
}

export interface PaymentVerificationRequest {
  adminNotes?: string;
}

class AdminPaymentApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all pending payments for admin review
  async getPendingPayments(): Promise<PendingPaymentWithUser[]> {
    const response = await this.makeRequest<{ success: boolean; data: PendingPaymentWithUser[] }>('/payments/admin/pending');
    return response.data;
  }

  // Get all payments with optional status filter
  async getAllPayments(status?: string): Promise<PaymentRecord[]> {
    const queryParam = status ? `?status=${status}` : '';
    const response = await this.makeRequest<{ success: boolean; data: PaymentRecord[] }>(`/payments/admin/all${queryParam}`);
    return response.data;
  }

  // Get payment statistics
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const response = await this.makeRequest<{ success: boolean; data: PaymentStatistics }>('/payments/admin/statistics');
    return response.data;
  }

  // Verify a payment
  async verifyPayment(paymentId: string, adminNotes?: string): Promise<PaymentRecord> {
    const response = await this.makeRequest<{ success: boolean; data: PaymentRecord }>(`/payments/admin/${paymentId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    });
    return response.data;
  }

  // Reject a payment
  async rejectPayment(paymentId: string, adminNotes: string): Promise<PaymentRecord> {
    const response = await this.makeRequest<{ success: boolean; data: PaymentRecord }>(`/payments/admin/${paymentId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    });
    return response.data;
  }

  // Download proof of payment (reuse from regular payment API)
  async downloadProofOfPayment(paymentId: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/payments/proof/${paymentId}/download`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Format currency amount
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // Format date
  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  // Get status color for display
  getStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }

  // Get participant type display name
  getParticipantTypeDisplay(participantType: string): string {
    return participantType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const adminPaymentApi = new AdminPaymentApiService();