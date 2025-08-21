import { PaymentInfo, PaymentStatusInfo, SubmitPaymentProofRequest, PaymentResponse } from '../types/payment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class PaymentApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
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

  // Get payment information and instructions
  async getPaymentInfo(): Promise<PaymentInfo> {
    const response = await this.makeRequest<{ success: boolean; data: PaymentInfo }>('/payments/info');
    return response.data;
  }

  // Get payment status and history
  async getPaymentStatus(): Promise<PaymentStatusInfo> {
    const response = await this.makeRequest<{ success: boolean; data: PaymentStatusInfo }>('/payments/status');
    return response.data;
  }

  // Submit proof of payment
  async submitProofOfPayment(paymentData: SubmitPaymentProofRequest): Promise<PaymentResponse> {
    const formData = new FormData();
    formData.append('amount', paymentData.amount.toString());
    formData.append('currency', paymentData.currency);
    formData.append('paymentMethod', paymentData.paymentMethod);
    if (paymentData.transactionReference) {
      formData.append('transactionReference', paymentData.transactionReference);
    }
    formData.append('proofFile', paymentData.proofFile);

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/payments/submit-proof`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Download proof of payment
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

  // Get payment record status display text
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'not_paid':
        return 'Payment Required';
      case 'payment_submitted':
        return 'Payment Under Review';
      case 'payment_verified':
        return 'Payment Verified';
      case 'payment_rejected':
        return 'Payment Rejected';
      default:
        return 'Unknown Status';
    }
  }

  // Get payment record status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'not_paid':
        return 'error';
      case 'payment_submitted':
        return 'warning';
      case 'payment_verified':
        return 'success';
      case 'payment_rejected':
        return 'error';
      default:
        return 'default';
    }
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
}

export const paymentApi = new PaymentApiService();