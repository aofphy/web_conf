import axios from 'axios';
import { CreateSubmissionRequest, UpdateSubmissionRequest, SubmissionResponse } from '../types/submission';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  submissions: T[];
  total: number;
  page: number;
  limit: number;
}

export const submissionApi = {
  // Create a new submission
  async createSubmission(submissionData: CreateSubmissionRequest): Promise<ApiResponse<SubmissionResponse>> {
    const response = await api.post('/submissions', submissionData);
    return response.data;
  },

  // Get user's submissions
  async getUserSubmissions(): Promise<ApiResponse<SubmissionResponse[]>> {
    const response = await api.get('/submissions/my-submissions');
    return response.data;
  },

  // Get submission by ID
  async getSubmissionById(id: string): Promise<ApiResponse<SubmissionResponse>> {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  },

  // Update submission
  async updateSubmission(id: string, updateData: UpdateSubmissionRequest): Promise<ApiResponse<SubmissionResponse>> {
    const response = await api.put(`/submissions/${id}`, updateData);
    return response.data;
  },

  // Delete submission
  async deleteSubmission(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/submissions/${id}`);
    return response.data;
  },

  // Get all submissions (admin/reviewer)
  async getAllSubmissions(params?: {
    page?: number;
    limit?: number;
    sessionType?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<SubmissionResponse>>> {
    const response = await api.get('/submissions', { params });
    return response.data;
  },

  // Update submission status (admin)
  async updateSubmissionStatus(id: string, status: string, adminNotes?: string): Promise<ApiResponse<SubmissionResponse>> {
    const response = await api.patch(`/submissions/${id}/status`, { status, adminNotes });
    return response.data;
  },

  // Get submissions by session type
  async getSubmissionsBySession(sessionType: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<SubmissionResponse>>> {
    const response = await api.get(`/submissions/session/${sessionType}`, { params });
    return response.data;
  },

  // Get submission statistics (admin)
  async getSubmissionStatistics(): Promise<ApiResponse<{
    totalSubmissions: number;
    submissionsByStatus: Record<string, number>;
    submissionsBySession: Record<string, number>;
    submissionsByPresentationType: Record<string, number>;
  }>> {
    const response = await api.get('/submissions/stats/overview');
    return response.data;
  },

  // Validate abstract markdown
  async validateAbstract(abstract: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    // This would typically be a backend call, but for now we'll do client-side validation
    // Import the validation function from utils
    const { validateAbstractMarkdown } = await import('../utils/markdown');
    return validateAbstractMarkdown(abstract);
  },

  // Manuscript management methods

  // Upload manuscript
  async uploadManuscript(submissionId: string, file: File): Promise<ApiResponse<{
    submissionId: string;
    manuscriptPath: string;
    originalName: string;
    size: number;
    uploadDate: Date;
  }>> {
    const formData = new FormData();
    formData.append('manuscript', file);

    const response = await api.post(`/submissions/${submissionId}/manuscript`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get manuscript info
  async getManuscriptInfo(submissionId: string): Promise<ApiResponse<{
    hasManuscript: boolean;
    submissionId: string;
    filename?: string;
    size?: number;
    mimetype?: string;
    uploadDate?: Date;
  }>> {
    const response = await api.get(`/submissions/${submissionId}/manuscript/info`);
    return response.data;
  },

  // Download manuscript
  async downloadManuscript(submissionId: string): Promise<Blob> {
    const response = await api.get(`/submissions/${submissionId}/manuscript/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete manuscript
  async deleteManuscript(submissionId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/submissions/${submissionId}/manuscript`);
    return response.data;
  }
};