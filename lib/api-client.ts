// Cloudflare Gateway API Client for Next.js
// Replaces direct Supabase calls with Cloudflare Gateway routing

import { fetchWithOfflineSupport } from "@/lib/offline-fetch";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://api.zamschool.com';

interface ApiClientOptions {
  token?: string;
  refreshToken?: string;
}

class CloudflareGatewayClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  
  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = GATEWAY_URL;
    this.token = options.token || null;
    this.refreshToken = options.refreshToken || null;
  }
  
  setToken(token: string, refreshToken?: string) {
    this.token = token;
    if (refreshToken) this.refreshToken = refreshToken;
  }
  
  clearToken() {
    this.token = null;
    this.refreshToken = null;
  }
  
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    if (this.refreshToken) {
      headers['X-Refresh-Token'] = this.refreshToken;
    }
    
    const response = await fetchWithOfflineSupport(url, {
      ...options,
      headers,
      credentials: 'include'
    });
    
    // Handle token refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.request(endpoint, options);
      }
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }
  
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetchWithOfflineSupport(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-Refresh-Token': this.refreshToken!
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.token = data.access_token;
        return true;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }
    
    this.clearToken();
    return false;
  }
  
  // Auth Methods
  auth = {
    login: (email: string, password: string) =>
      this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    
    register: (data: any) =>
      this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    logout: () =>
      this.request('/api/auth/logout', { method: 'POST' }),
    
    forgotPassword: (email: string) =>
      this.request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    
    resetPassword: (token: string, newPassword: string) =>
      this.request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      }),
    
    verifyEmail: (token: string, email: string) =>
      this.request('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, email })
      }),
    
    getProfile: () =>
      this.request('/api/auth/me'),
    
    updateProfile: (data: any) =>
      this.request('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    
    changePassword: (currentPassword: string, newPassword: string) =>
      this.request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      }),
    
    switchSchool: (schoolId: string) =>
      this.request('/api/auth/switch-school', {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      })
  };
  
  // Query Methods (Read operations)
  query = {
    schools: (params?: URLSearchParams) =>
      this.request(`/api/query/schools?${params?.toString() || ''}`),
    
    users: (params?: URLSearchParams) =>
      this.request(`/api/query/users?${params?.toString() || ''}`),
    
    students: (params?: URLSearchParams) =>
      this.request(`/api/query/students?${params?.toString() || ''}`),
    
    teachers: (params?: URLSearchParams) =>
      this.request(`/api/query/teachers?${params?.toString() || ''}`),
    
    classes: (params?: URLSearchParams) =>
      this.request(`/api/query/classes?${params?.toString() || ''}`),
    
    attendance: (params?: URLSearchParams) =>
      this.request(`/api/query/attendance?${params?.toString() || ''}`),
    
    results: (params?: URLSearchParams) =>
      this.request(`/api/query/results?${params?.toString() || ''}`),
    
    payments: (params?: URLSearchParams) =>
      this.request(`/api/query/payments?${params?.toString() || ''}`),
    
    announcements: (params?: URLSearchParams) =>
      this.request(`/api/query/announcements?${params?.toString() || ''}`),
    
    events: (params?: URLSearchParams) =>
      this.request(`/api/query/events?${params?.toString() || ''}`),
    
    timetable: (params?: URLSearchParams) =>
      this.request(`/api/query/timetable?${params?.toString() || ''}`),
    
    dashboard: (params?: URLSearchParams) =>
      this.request(`/api/query/dashboard?${params?.toString() || ''}`),
    
    notifications: (params?: URLSearchParams) =>
      this.request(`/api/query/notifications?${params?.toString() || ''}`),
    
    getById: (entity: string, id: string) =>
      this.request(`/api/query/${entity}/${id}`)
  };
  
  // Mutation Methods (Write operations)
  mutation = {
    createStudent: (data: any) =>
      this.request('/api/mutation/students/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    updateStudent: (data: any) =>
      this.request('/api/mutation/students/update', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    deleteStudent: (studentId: string) =>
      this.request('/api/mutation/students/delete', {
        method: 'POST',
        body: JSON.stringify({ id: studentId })
      }),
    
    createTeacher: (data: any) =>
      this.request('/api/mutation/teachers/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    createClass: (data: any) =>
      this.request('/api/mutation/classes/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    updateClass: (data: any) =>
      this.request('/api/mutation/classes/update', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    markAttendance: (data: any) =>
      this.request('/api/mutation/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    publishResults: (data: any) =>
      this.request('/api/mutation/results/publish', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    updateResult: (data: any) =>
      this.request('/api/mutation/results/update', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    createAnnouncement: (data: any) =>
      this.request('/api/mutation/announcements/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    createEvent: (data: any) =>
      this.request('/api/mutation/events/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    createPayment: (data: any) =>
      this.request('/api/mutation/payments/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    processPayment: (data: any) =>
      this.request('/api/mutation/payments/process', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    createAssignment: (data: any) =>
      this.request('/api/mutation/assignments/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    submitAssignment: (data: any) =>
      this.request('/api/mutation/assignments/submit', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    sendMessage: (data: any) =>
      this.request('/api/mutation/messages/send', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    markNotificationsRead: (notificationIds: string[]) =>
      this.request('/api/mutation/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds })
      }),
    
    updateSchoolSettings: (data: any) =>
      this.request('/api/mutation/schools/settings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    bulkOperation: (operation: string, userIds: string[], data?: any) =>
      this.request('/api/mutation/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ operation, userIds, data })
      })
  };
  
  // File Operations
  files = {
    upload: async (file: File, path: string, onProgress?: (progress: number) => void) => {
      const key = `${path}/${Date.now()}-${file.name}`;
      
      const response = await fetchWithOfflineSupport(`${this.baseUrl}/api/files/${key}`, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      
      return response.json();
    },
    
    get: (key: string) =>
      `${this.baseUrl}/api/files/${key}`,
    
    delete: (key: string) =>
      this.request(`/api/files/${key}`, { method: 'DELETE' })
  };
  
  // Image Operations with transformation
  images = {
    get: (key: string, options?: { width?: number; height?: number; format?: 'webp' | 'jpeg' | 'png' }) => {
      const params = new URLSearchParams();
      if (options?.width) params.set('w', String(options.width));
      if (options?.height) params.set('h', String(options.height));
      if (options?.format) params.set('f', options.format);
      
      return `${this.baseUrl}/api/images/${key}${params.toString() ? '?' + params.toString() : ''}`;
    },
    
    upload: async (file: File, path: string) => {
      const key = `${path}/${Date.now()}-${file.name}`;
      
      const response = await fetchWithOfflineSupport(`${this.baseUrl}/api/images/${key}`, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error('Image upload failed');
      }
      
      return { key, url: this.images.get(key) };
    }
  };
  
  // Queue/Job Operations
  jobs = {
    submit: (type: string, payload: any, priority?: 'high' | 'normal' | 'low') =>
      this.request('/api/jobs/submit', {
        method: 'POST',
        body: JSON.stringify({ type, payload, priority })
      })
  };
  
  // Health Check
  health = () =>
    this.request('/health');
}

// Create singleton instance
export const apiClient = new CloudflareGatewayClient();

// React Hook for API client
export function useApiClient() {
  return apiClient;
}

export default CloudflareGatewayClient;
