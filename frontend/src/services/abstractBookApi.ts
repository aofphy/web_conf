const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AbstractBookFilters {
  sessionTypes?: string[];
  presentationTypes?: string[];
  status?: string;
  includeKeywords?: boolean;
  includeAuthors?: boolean;
}

export interface AbstractBookTemplate {
  title: string;
  subtitle?: string;
  coverPage: {
    conferenceTitle: string;
    conferenceSubtitle?: string;
    dates: string;
    venue: string;
    organizers?: string[];
    logo?: string;
  };
  styling: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    margins: string;
    headerColor: string;
    accentColor: string;
  };
  sections: {
    includeTableOfContents: boolean;
    includeSessionSeparators: boolean;
    includeAuthorIndex: boolean;
    includeKeywordIndex: boolean;
  };
}

export interface AbstractBookPreview {
  metadata: {
    title: string;
    generatedDate: string;
    totalAbstracts: number;
    sessionBreakdown: Record<string, number>;
    presentationBreakdown: Record<string, number>;
  };
  sessionSummary: Array<{
    sessionType: string;
    sessionName: string;
    abstractCount: number;
  }>;
  totalAbstracts: number;
  hasIndexes: boolean;
}

export interface FilterOptions {
  sessionTypes: Array<{ value: string; label: string }>;
  presentationTypes: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  formatOptions: Array<{ value: string; label: string }>;
}

export interface SavedAbstractBook {
  filename: string;
  format: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface GenerateRequest {
  format: 'html' | 'pdf' | 'docx';
  filters?: AbstractBookFilters;
  template?: AbstractBookTemplate;
  pdfOptions?: {
    includePageNumbers?: boolean;
    includeBookmarks?: boolean;
    printBackground?: boolean;
  };
}

export interface SaveRequest extends GenerateRequest {
  filename?: string;
}

class AbstractBookApi {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async previewAbstractBook(filters?: AbstractBookFilters): Promise<AbstractBookPreview> {
    const queryParams = new URLSearchParams();
    
    if (filters?.sessionTypes?.length) {
      queryParams.append('sessionTypes', filters.sessionTypes.join(','));
    }
    if (filters?.presentationTypes?.length) {
      queryParams.append('presentationTypes', filters.presentationTypes.join(','));
    }
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.includeKeywords) {
      queryParams.append('includeKeywords', 'true');
    }
    if (filters?.includeAuthors) {
      queryParams.append('includeAuthors', 'true');
    }

    const url = `${API_BASE_URL}/abstract-book/preview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to preview abstract book');
    }

    const result = await response.json();
    return result.data;
  }

  async generateAbstractBook(request: GenerateRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate abstract book');
    }

    return response.blob();
  }

  async saveAbstractBook(request: SaveRequest): Promise<{
    filename: string;
    path: string;
    size: number;
    format: string;
    contentType: string;
    generatedAt: string;
    abstractCount: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/save`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to save abstract book');
    }

    const result = await response.json();
    return result.data;
  }

  async getDefaultTemplate(): Promise<AbstractBookTemplate> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/template/default`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get default template');
    }

    const result = await response.json();
    return result.data;
  }

  async getFilterOptions(): Promise<FilterOptions> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/filters`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get filter options');
    }

    const result = await response.json();
    return result.data;
  }

  async listSavedAbstractBooks(): Promise<SavedAbstractBook[]> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/saved`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to list saved abstract books');
    }

    const result = await response.json();
    return result.data;
  }

  async downloadAbstractBook(filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/abstract-book/download/${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to download abstract book');
    }

    return response.blob();
  }

  // Utility method to download blob as file
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const abstractBookApi = new AbstractBookApi();