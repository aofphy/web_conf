import axios from 'axios';
import { Conference, Session, RegistrationFee, PaymentInstructions, ApiResponse } from '../types/conference';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const conferenceApi = {
  // Get active conference with all details
  getActiveConference: async (): Promise<Conference> => {
    const response = await api.get<ApiResponse<Conference>>('/conference/active');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch conference');
    }
    return response.data.data;
  },

  // Get conference by ID
  getConferenceById: async (id: string): Promise<Conference> => {
    const response = await api.get<ApiResponse<Conference>>(`/conference/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch conference');
    }
    return response.data.data;
  },

  // Get conference sessions
  getConferenceSessions: async (conferenceId: string): Promise<Session[]> => {
    const response = await api.get<ApiResponse<Session[]>>(`/conference/${conferenceId}/sessions`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch sessions');
    }
    return response.data.data;
  },

  // Get registration fees
  getRegistrationFees: async (conferenceId: string): Promise<RegistrationFee[]> => {
    const response = await api.get<ApiResponse<RegistrationFee[]>>(`/conference/${conferenceId}/fees`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch registration fees');
    }
    return response.data.data;
  },

  // Get payment instructions
  getPaymentInstructions: async (conferenceId: string): Promise<PaymentInstructions> => {
    const response = await api.get<ApiResponse<PaymentInstructions>>(`/conference/${conferenceId}/payment-instructions`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch payment instructions');
    }
    return response.data.data;
  },
};