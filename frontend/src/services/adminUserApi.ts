import { UserResponse, UserRole, PaymentStatus } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  participantType?: string;
  paymentStatus?: PaymentStatus;
  search?: string;
}

export interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserStatistics {
  totalUsers: number;
  roleDistribution: Record<string, number>;
  participantTypeDistribution: Record<string, number>;
  paymentStatusDistribution: Record<string, number>;
  registrationTimeline: Array<{
    date: string;
    registrations: number;
  }>;
  sessionPopularity: Array<{
    session_type: string;
    count: number;
  }>;
}

class AdminUserApi {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getAllUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch users');
    }

    const result = await response.json();
    return result.data;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update user role');
    }

    const result = await response.json();
    return result.data.user;
  }

  async updateUserPaymentStatus(userId: string, paymentStatus: PaymentStatus): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/payment-status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ paymentStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update payment status');
    }

    const result = await response.json();
    return result.data.user;
  }

  async deactivateUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to deactivate user');
    }
  }

  async getUserStatistics(): Promise<UserStatistics> {
    const response = await fetch(`${API_BASE_URL}/admin/users/statistics`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch user statistics');
    }

    const result = await response.json();
    return result.data;
  }
}

export const adminUserApi = new AdminUserApi();