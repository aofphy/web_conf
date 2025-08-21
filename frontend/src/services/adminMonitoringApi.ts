const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface SubmissionStatistics {
  totalSubmissions: number;
  statusDistribution: Record<string, number>;
  sessionDistribution: Record<string, number>;
  presentationTypeDistribution: Record<string, number>;
  submissionTimeline: Array<{
    date: string;
    submissions: number;
  }>;
}

export interface ReviewProgress {
  reviewStats: {
    totalReviews: number;
    completedReviews: number;
    pendingReviews: number;
    completionRate: string;
  };
  recommendationDistribution: Record<string, number>;
  reviewerWorkload: Array<{
    first_name: string;
    last_name: string;
    email: string;
    total_assigned: number;
    completed: number;
    pending: number;
  }>;
  submissionsNeedingReview: Array<{
    id: string;
    title: string;
    session_type: string;
    status: string;
    review_count: number;
    assigned_reviewers: string[];
  }>;
}

export interface MonitoringDashboard {
  submissionOverview: Record<string, Record<string, number>>;
  recentActivity: Array<{
    type: 'submission' | 'review';
    title: string;
    user_name: string;
    timestamp: string;
    status: string;
  }>;
  overdueReviews: Array<{
    review_id: string;
    submission_title: string;
    session_type: string;
    reviewer_name: string;
    reviewer_email: string;
    assigned_date: string;
    days_overdue: number;
  }>;
  summary: {
    totalSubmissions: number;
    overdueReviewCount: number;
    recentActivityCount: number;
  };
}

export interface SendRemindersRequest {
  reviewerIds: string[];
  message?: string;
}

class AdminMonitoringApi {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getSubmissionStatistics(): Promise<SubmissionStatistics> {
    const response = await fetch(`${API_BASE_URL}/admin/submissions/statistics`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch submission statistics');
    }

    const result = await response.json();
    return result.data;
  }

  async getReviewProgress(): Promise<ReviewProgress> {
    const response = await fetch(`${API_BASE_URL}/admin/reviews/progress`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch review progress');
    }

    const result = await response.json();
    return result.data;
  }

  async sendReviewReminders(data: SendRemindersRequest): Promise<{
    remindersSent: number;
    reviewersNotified: number;
    totalPendingReviews: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/admin/reviews/send-reminders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send reminders');
    }

    const result = await response.json();
    return result.data;
  }

  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    const response = await fetch(`${API_BASE_URL}/admin/monitoring/dashboard`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch monitoring dashboard');
    }

    const result = await response.json();
    return result.data;
  }
}

export const adminMonitoringApi = new AdminMonitoringApi();