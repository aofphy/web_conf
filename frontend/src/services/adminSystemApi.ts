const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface SystemHealth {
  database: {
    status: string;
    currentTime: string;
    version: string;
    responseTime: number;
  };
  databaseStats: Array<{
    schemaname: string;
    tablename: string;
    inserts: number;
    updates: number;
    deletes: number;
    live_tuples: number;
    dead_tuples: number;
  }>;
  system: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
  };
  application: {
    activeUsers: number;
    totalSubmissions: number;
    totalReviews: number;
    totalPayments: number;
  };
}

export interface SystemConfig {
  conference: {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    venue: string;
    registration_deadline: string;
    submission_deadline: string;
    created_at: string;
    updated_at: string;
  } | null;
  sessions: Array<{
    id: string;
    conference_id: string;
    type: string;
    name: string;
    description: string;
    created_at: string;
  }>;
  paymentInstructions: {
    id: string;
    conference_id: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    swift_code: string;
    routing_number: string;
    instructions: string;
    support_contact: string;
    created_at: string;
    updated_at: string;
  } | null;
  environment: {
    nodeEnv: string;
    port: string;
    frontendUrl: string;
  };
}

export interface UpdateConfigRequest {
  conference?: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    registrationDeadline?: string;
    submissionDeadline?: string;
  };
  paymentInstructions?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    swiftCode?: string;
    routingNumber?: string;
    instructions?: string;
    supportContact?: string;
  };
}

export interface BackupMetadata {
  id: string;
  createdAt: string;
  createdBy: string;
  includeUserData: boolean;
  tables: Array<{
    table_name: string;
    row_count: number;
  }>;
  databaseVersion: string;
  applicationVersion: string;
}

export interface SystemLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source: string;
}

class AdminSystemApi {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await fetch(`${API_BASE_URL}/admin/system/health`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch system health');
    }

    const result = await response.json();
    return result.data;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const response = await fetch(`${API_BASE_URL}/admin/system/config`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch system configuration');
    }

    const result = await response.json();
    return result.data;
  }

  async updateSystemConfig(config: UpdateConfigRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/system/config`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update system configuration');
    }
  }

  async createBackup(includeUserData: boolean = false): Promise<BackupMetadata> {
    const response = await fetch(`${API_BASE_URL}/admin/system/backup`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ includeUserData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create backup');
    }

    const result = await response.json();
    return result.data.backup;
  }

  async getSystemLogs(): Promise<SystemLog[]> {
    const response = await fetch(`${API_BASE_URL}/admin/system/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch system logs');
    }

    const result = await response.json();
    return result.data.logs;
  }
}

export const adminSystemApi = new AdminSystemApi();