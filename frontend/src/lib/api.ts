const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    // Add timeout to fetch request (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const fetchOptions: RequestInit = {
      ...options,
      signal: options.signal || controller.signal, // Use provided signal or create new one
      credentials: options.credentials || 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Handle network errors
    if (!response.ok && response.status === 0) {
      throw new Error('Network error: Unable to connect to server');
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If response is not JSON, return error
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: response.statusText || 'Invalid response from server',
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!response.ok) {
      // Handle error responses
      const errorData = data.error || {
        code: data.code || 'UNKNOWN_ERROR',
        message: data.message || response.statusText || 'An error occurred',
        details: data.details,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      
      return {
        success: false,
        error: errorData,
      };
    }

    // Success response - extract data
    // Backend returns: { success: true, data: {...} }
    // So we return: { success: true, data: data.data || data }
    const extractedData = data.data !== undefined ? data.data : data;
    
    // Log response structure for debugging
    if (import.meta.env.DEV) {
      console.log('✅ API Success:', {
        endpoint,
        hasData: !!extractedData,
        dataKeys: extractedData ? Object.keys(extractedData) : [],
      });
    }
    
    return {
      success: true,
      data: extractedData,
    };
  } catch (error: any) {
    // Handle fetch errors (network failures, CORS, etc.)
    let errorMessage = 'Failed to fetch. ';
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage += 'Please ensure the backend server is running at ' + API_BASE_URL;
    } else if (error.message?.includes('CORS')) {
      errorMessage += 'CORS error. Please check server configuration.';
    } else {
      errorMessage += error.message || 'Please check your connection and ensure the server is running.';
    }
    
    console.error('API Request Error:', {
      url,
      error: error.message,
      stack: error.stack,
    });
    
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Helper to get auth token from localStorage or cookie
function getAuthToken(): string | null {
  // In a real app, you'd get this from your auth context/store
  return localStorage.getItem('accessToken');
}

// Helper to add auth headers
function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  
  // Only add Authorization header if token exists and not explicitly overridden
  if (token && !customHeaders.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  search: {
    post: <T>(body: unknown) =>
      apiRequest<T>('/api/search', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
  },
  preferences: {
    get: <T>() =>
      apiRequest<T>('/api/preferences', {
        method: 'GET',
        headers: getHeaders(),
      }),
    put: <T>(body: unknown) =>
      apiRequest<T>('/api/preferences', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
  },
  playlists: {
    get: <T>(params?: { id?: string }) => {
      const url = params?.id ? `/api/playlists/${params.id}` : '/api/playlists';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    post: <T>(body: unknown) =>
      apiRequest<T>('/api/playlists', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    put: <T>(id: string, body: unknown) =>
      apiRequest<T>(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/playlists/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    addItem: <T>(id: string, body: unknown) =>
      apiRequest<T>(`/api/playlists/${id}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    removeItem: <T>(id: string, itemId: string) =>
      apiRequest<T>(`/api/playlists/${id}/items/${itemId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    reorder: <T>(id: string, body: unknown) =>
      apiRequest<T>(`/api/playlists/${id}/reorder`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
  },
  content: {
    get: <T>(id: string) =>
      apiRequest<T>(`/api/content/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    trackView: <T>(id: string, body: unknown) =>
      apiRequest<T>(`/api/content/${id}/view`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    like: <T>(id: string) =>
      apiRequest<T>(`/api/content/${id}/like`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    getLiked: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/content/liked${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getHistory: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/content/history${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
  },
  creators: {
    getAll: <T>(params?: { page?: number; limit?: number; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.search) searchParams.append('search', params.search);
      const query = searchParams.toString();
      const url = `/api/creators${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    get: <T>(id: string) =>
      apiRequest<T>(`/api/creators/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    getByHandle: <T>(handle: string) =>
      apiRequest<T>(`/api/creators/handle/${handle}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    follow: <T>(id: string) =>
      apiRequest<T>(`/api/creators/${id}/follow`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    getFollowing: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/creators/following${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
  },
  upload: {
    content: async <T>(formData: FormData): Promise<ApiResponse<T>> => {
      const token = getAuthToken();
      const url = `${API_BASE_URL}/api/upload/content`;
      
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        // Don't set Content-Type - browser will set it with boundary for FormData

        // Create an AbortController for timeout (10 minutes for large uploads)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok && response.status === 0) {
          throw new Error('Network error: Unable to connect to server');
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          return {
            success: false,
            error: {
              code: 'INVALID_RESPONSE',
              message: response.statusText || 'Invalid response from server',
              timestamp: new Date().toISOString(),
            },
          };
        }

        if (!response.ok) {
          const errorData = data.error || {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || response.statusText || 'An error occurred',
            details: data.details,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          
          return {
            success: false,
            error: errorData,
          };
        }

        return {
          success: true,
          data: data.data !== undefined ? data.data : data,
        };
      } catch (error: any) {
        let errorMessage = 'Failed to upload. ';
        
        if (error.name === 'AbortError') {
          errorMessage = 'Upload timed out. The file may be too large or the server is taking too long to respond. Please try again with a smaller file.';
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          errorMessage += 'Please ensure the backend server is running at ' + API_BASE_URL;
        } else if (error.message?.includes('CORS')) {
          errorMessage += 'CORS error. Please check server configuration.';
        } else {
          errorMessage += error.message || 'Please check your connection and ensure the server is running.';
        }
        
        console.error('Upload Error:', {
          url,
          error: error.message,
          stack: error.stack,
        });
        
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        };
      }
    },
  },
  analytics: {
    trackViewEvent: <T>(body: unknown) =>
      apiRequest<T>('/api/analytics/view-event', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    trackInteraction: <T>(body: unknown) =>
      apiRequest<T>('/api/analytics/interaction', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }),
    getStats: <T>() =>
      apiRequest<T>('/api/analytics/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  recommendations: {
    getSimilar: <T>(contentId: string, limit?: number) => {
      const url = limit 
        ? `/api/recommendations/similar/${contentId}?limit=${limit}`
        : `/api/recommendations/similar/${contentId}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getUserRecommendations: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/user?limit=${limit}`
        : '/api/recommendations/user';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getForYou: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/for-you?limit=${limit}`
        : '/api/recommendations/for-you';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getTrendingNow: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/trending-now?limit=${limit}`
        : '/api/recommendations/trending-now';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getFollowedCreators: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/followed-creators?limit=${limit}`
        : '/api/recommendations/followed-creators';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getContinueWatching: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/continue-watching?limit=${limit}`
        : '/api/recommendations/continue-watching';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getRegional: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/regional?limit=${limit}`
        : '/api/recommendations/regional';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getLastWatchedSimilar: <T>(limit?: number) => {
      const url = limit 
        ? `/api/recommendations/last-watched-similar?limit=${limit}`
        : '/api/recommendations/last-watched-similar';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
  },
  comments: {
    get: <T>(contentId: string, params?: { sort?: 'top' | 'newest' | 'oldest'; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.sort) searchParams.append('sort', params.sort);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/comments/${contentId}${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    create: <T>(data: { contentId: string; text: string; parentId?: string }) => {
      return apiRequest<T>('/api/comments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
    },
    update: <T>(id: string, data: { text: string }) => {
      return apiRequest<T>(`/api/comments/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
    },
    delete: <T>(id: string) => {
      return apiRequest<T>(`/api/comments/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    },
    like: <T>(id: string, type: 'like' | 'dislike') => {
      return apiRequest<T>(`/api/comments/${id}/like`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type }),
      });
    },
    pin: <T>(id: string) => {
      return apiRequest<T>(`/api/comments/${id}/pin`, {
        method: 'POST',
        headers: getHeaders(),
      });
    },
    report: <T>(id: string, data: { reason: string; type?: string }) => {
      return apiRequest<T>(`/api/comments/${id}/report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
    },
  },
  tips: {
    create: <T>(data: {
      toCreatorId: string;
      amount: number;
      currency?: string;
      message?: string;
      isAnonymous?: boolean;
    }) =>
      apiRequest<T>('/api/tips', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    get: <T>(params?: {
      creatorId?: string;
      status?: 'pending' | 'completed' | 'failed' | 'refunded';
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.creatorId) searchParams.append('creatorId', params.creatorId);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/tips${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getByCreator: <T>(creatorId: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/tips/creator/${creatorId}${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getById: <T>(id: string) =>
      apiRequest<T>(`/api/tips/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    confirmPayment: <T>(tipId: string, data: { paymentIntentId: string }) =>
      apiRequest<T>(`/api/tips/${tipId}/confirm-payment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
  },
  earnings: {
    get: <T>(params?: { startDate?: string; endDate?: string; type?: 'tips' | 'subscriptions' | 'all' }) => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.type) searchParams.append('type', params.type);
      const query = searchParams.toString();
      return apiRequest<T>(`/api/earnings${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getStats: <T>() =>
      apiRequest<T>('/api/earnings/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  payouts: {
    get: <T>() =>
      apiRequest<T>('/api/payouts', {
        method: 'GET',
        headers: getHeaders(),
      }),
    getBalance: <T>() =>
      apiRequest<T>('/api/payouts/balance', {
        method: 'GET',
        headers: getHeaders(),
      }),
    request: <T>(data: {
      accountNumber: string;
      ifsc: string;
      beneficiaryName: string;
      amount?: number;
    }) =>
      apiRequest<T>('/api/payouts/request', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getById: <T>(payoutId: string) =>
      apiRequest<T>(`/api/payouts/${payoutId}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  privacy: {
    get: <T>() =>
      apiRequest<T>('/api/privacy', {
        method: 'GET',
        headers: getHeaders(),
      }),
    update: <T>(data: {
      hideHistory?: boolean;
      anonymousMode?: boolean;
      allowPersonalization?: boolean;
      showActivityStatus?: boolean;
      allowMessages?: 'everyone' | 'following' | 'none';
      showWatchHistory?: 'public' | 'friends' | 'private';
      showPlaylists?: 'public' | 'friends' | 'private';
      showLikedContent?: 'public' | 'friends' | 'private';
    }) =>
      apiRequest<T>('/api/privacy', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    setHistoryLock: <T>(data: { enabled: boolean; pin?: string }) =>
      apiRequest<T>('/api/privacy/history-lock', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    verifyHistoryLock: <T>(data: { pin: string }) =>
      apiRequest<T>('/api/privacy/verify-history-lock', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    exportData: <T>(data: {
      format?: 'json' | 'csv';
      includeContent?: boolean;
      includeHistory?: boolean;
      includePlaylists?: boolean;
    }) =>
      apiRequest<T>('/api/privacy/export-data', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    requestDeletion: <T>(data: { reason?: string; password: string }) =>
      apiRequest<T>('/api/privacy/delete-account', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    cancelDeletion: <T>() =>
      apiRequest<T>('/api/privacy/cancel-deletion', {
        method: 'POST',
        headers: getHeaders(),
      }),
    getDeletionStatus: <T>() =>
      apiRequest<T>('/api/privacy/deletion-status', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  moderation: {
    createReport: <T>(data: {
      contentType: 'content' | 'comment' | 'creator';
      targetId?: string;
      contentId?: string;
      reportedUserId?: string;
      type: string;
      reason: string;
      description?: string;
    }) =>
      apiRequest<T>('/api/moderation/report', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getQueue: <T>(params?: {
      status?: string;
      contentType?: string;
      severity?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.contentType) searchParams.append('contentType', params.contentType);
      if (params?.severity) searchParams.append('severity', params.severity);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
      const queryString = searchParams.toString();
      const url = `/api/moderation/queue${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getReport: <T>(id: string) =>
      apiRequest<T>(`/api/moderation/reports/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    updateReport: <T>(id: string, data: {
      status?: string;
      action?: string;
      moderatorNotes?: string;
    }) =>
      apiRequest<T>(`/api/moderation/reports/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    resolveReport: <T>(id: string, data: {
      status: string;
      action?: string;
      moderatorNotes?: string;
    }) =>
      apiRequest<T>(`/api/moderation/reports/${id}/resolve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getStats: <T>() =>
      apiRequest<T>('/api/moderation/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  auth: {
    register: <T>(data: {
      email: string;
      username: string;
      password: string;
      displayName?: string;
    }) =>
      apiRequest<T>('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    login: <T>(data: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) =>
      apiRequest<T>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      }),
    logout: <T>() => {
      const token = getAuthToken();
      return apiRequest<T>('/api/auth/logout', {
        method: 'POST',
        headers: token 
          ? {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            }
          : {
              'Content-Type': 'application/json',
            },
        credentials: 'include',
      });
    },
    me: <T>() =>
      apiRequest<T>('/api/auth/me', {
        method: 'GET',
        headers: getHeaders(),
      }),
    refresh: <T>(refreshToken?: string) =>
      apiRequest<T>('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      }),
    changePassword: <T>(data: {
      currentPassword: string;
      newPassword: string;
    }) =>
      apiRequest<T>('/api/auth/change-password', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
  },
  live: {
    getAll: <T>(params?: { status?: 'live' | 'upcoming' | 'all'; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/live${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    get: <T>(id: string) =>
      apiRequest<T>(`/api/live/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    create: <T>(data: {
      title: string;
      description?: string;
      category?: string;
      tags?: string[];
      scheduledFor?: string;
      chatEnabled?: boolean;
      isRecorded?: boolean;
    }) =>
      apiRequest<T>('/api/live', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    update: <T>(id: string, data: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      chatEnabled?: boolean;
      isRecorded?: boolean;
    }) =>
      apiRequest<T>(`/api/live/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    start: <T>(id: string, data?: { playbackUrl?: string }) =>
      apiRequest<T>(`/api/live/${id}/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      }),
    end: <T>(id: string, data?: { recordingUrl?: string }) =>
      apiRequest<T>(`/api/live/${id}/end`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      }),
    addViewer: <T>(id: string) =>
      apiRequest<T>(`/api/live/${id}/viewer`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    removeViewer: <T>(id: string) =>
      apiRequest<T>(`/api/live/${id}/viewer`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    getChat: <T>(id: string, limit?: number) => {
      const searchParams = new URLSearchParams();
      if (limit) searchParams.append('limit', limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/live/${id}/chat${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    sendMessage: <T>(id: string, message: string) =>
      apiRequest<T>(`/api/live/${id}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message }),
      }),
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/live/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
  },
  plans: {
    getAll: <T>() =>
      apiRequest<T>('/api/plans', {
        method: 'GET',
        headers: getHeaders(),
      }),
    get: <T>(id: string) =>
      apiRequest<T>(`/api/plans/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  subscriptions: {
    create: <T>(data: { plan: string }) =>
      apiRequest<T>('/api/subscriptions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getAll: <T>() =>
      apiRequest<T>('/api/subscriptions', {
        method: 'GET',
        headers: getHeaders(),
      }),
    get: <T>(id: string) =>
      apiRequest<T>(`/api/subscriptions/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    cancel: <T>(id: string, data?: { cancelAtPeriodEnd?: boolean }) =>
      apiRequest<T>(`/api/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || { cancelAtPeriodEnd: false }),
      }),
  },
  razorpay: {
    createOrder: <T>(data: { amount: number; currency?: string; metadata?: Record<string, string> }) =>
      apiRequest<T>('/api/razorpay/create-order', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    verifyPayment: <T>(data: { orderId: string; paymentId: string; signature: string }) =>
      apiRequest<T>('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    createCheckout: <T>(data: { planId: string }) =>
      apiRequest<T>('/api/razorpay/create-checkout', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    createSubscription: <T>(data: { planId: string }) =>
      apiRequest<T>('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getSubscription: <T>(subscriptionId: string) =>
      apiRequest<T>(`/api/razorpay/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  giftcards: {
    purchase: <T>(data: {
      amount: number;
      currency?: string;
      recipientEmail?: string;
      personalMessage?: string;
      sendDate?: string;
      expiresInDays?: number;
    }) =>
      apiRequest<T>('/api/giftcards/purchase', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    redeem: <T>(data: { code: string }) =>
      apiRequest<T>('/api/giftcards/redeem', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getMyPurchases: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/giftcards/my-purchases${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getMyRedemptions: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/giftcards/my-redemptions${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getByCode: <T>(code: string) =>
      apiRequest<T>(`/api/giftcards/${code}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  loyalty: {
    getStatus: <T>() =>
      apiRequest<T>('/api/loyalty/status', {
        method: 'GET',
        headers: getHeaders(),
      }),
    earnPoints: <T>(data: { points: number; reason: string; metadata?: any }) =>
      apiRequest<T>('/api/loyalty/earn', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getTransactions: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/loyalty/transactions${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getRewards: <T>(params?: { category?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append('category', params.category);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/loyalty/rewards${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    redeemReward: <T>(data: { rewardId: string }) =>
      apiRequest<T>('/api/loyalty/redeem', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getReward: <T>(id: string) =>
      apiRequest<T>(`/api/loyalty/rewards/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    claimDailyLogin: <T>() =>
      apiRequest<T>('/api/loyalty/daily-login', {
        method: 'POST',
        headers: getHeaders(),
      }),
  },
  creatorAnalytics: {
    getOverview: <T>(params?: { timeRange?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      const query = searchParams.toString();
      const url = `/api/creator-analytics/overview${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getViewsOverTime: <T>(params?: { timeRange?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      const query = searchParams.toString();
      const url = `/api/creator-analytics/views-over-time${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getTopContent: <T>(params?: { timeRange?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/creator-analytics/top-content${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getTrafficSources: <T>(params?: { timeRange?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      const query = searchParams.toString();
      const url = `/api/creator-analytics/traffic-sources${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getAudience: <T>(params?: { timeRange?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      const query = searchParams.toString();
      const url = `/api/creator-analytics/audience${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getContentPerformance: <T>(params?: {
      timeRange?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/creator-analytics/content-performance${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
  },
  affiliates: {
    apply: <T>(data?: { commissionRate?: number }) =>
      apiRequest<T>('/api/affiliates/apply', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      }),
    getMe: <T>() =>
      apiRequest<T>('/api/affiliates/me', {
        method: 'GET',
        headers: getHeaders(),
      }),
    getReferrals: <T>(params?: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'converted' | 'paid';
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.status) searchParams.append('status', params.status);
      const query = searchParams.toString();
      const url = `/api/affiliates/referrals${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getStats: <T>() =>
      apiRequest<T>('/api/affiliates/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
    getByCode: <T>(code: string) =>
      apiRequest<T>(`/api/affiliates/${code}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    update: <T>(data: { status?: string; commissionRate?: number }) =>
      apiRequest<T>('/api/affiliates/me', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getBanners: <T>() =>
      apiRequest<T>('/api/affiliates/banners', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  notifications: {
    getAll: <T>(params?: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.unreadOnly) searchParams.append('unreadOnly', 'true');
      const query = searchParams.toString();
      const url = `/api/notifications${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getUnreadCount: <T>() =>
      apiRequest<T>('/api/notifications/unread-count', {
        method: 'GET',
        headers: getHeaders(),
      }),
    markAsRead: <T>(id: string) =>
      apiRequest<T>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders(),
      }),
    markAllAsRead: <T>() =>
      apiRequest<T>('/api/notifications/read-all', {
        method: 'PATCH',
        headers: getHeaders(),
      }),
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    getPreferences: <T>() =>
      apiRequest<T>('/api/notifications/preferences', {
        method: 'GET',
        headers: getHeaders(),
      }),
    updatePreferences: <T>(data: {
      email?: Record<string, boolean>;
      push?: Record<string, boolean>;
      inApp?: Record<string, boolean>;
      frequency?: 'instant' | 'daily' | 'weekly' | 'never';
      unsubscribedAll?: boolean;
    }) =>
      apiRequest<T>('/api/notifications/preferences', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
  },
  push: {
    getVAPIDKey: <T>() =>
      apiRequest<T>('/api/push/vapid-key', {
        method: 'GET',
        headers: getHeaders(),
      }),
    subscribe: <T>(data: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
      device?: string;
    }) =>
      apiRequest<T>('/api/push/subscribe', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    unsubscribe: <T>(data: { endpoint: string }) =>
      apiRequest<T>('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getSubscriptions: <T>() =>
      apiRequest<T>('/api/push/subscriptions', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  feedback: {
    submit: <T>(data: {
      type: 'bug_report' | 'feature_request' | 'general_feedback';
      message: string;
      screenshot?: string;
      url?: string;
      metadata?: Record<string, any>;
    }) =>
      apiRequest<T>('/api/feedback', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getAll: <T>(params?: {
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.type) searchParams.append('type', params.type);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/feedback${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    get: <T>(id: string) =>
      apiRequest<T>(`/api/feedback/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    updateStatus: <T>(id: string, data: { status: string }) =>
      apiRequest<T>(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
  },
  funnelAnalytics: {
    getFunnels: <T>() =>
      apiRequest<T>('/api/funnel-analytics/funnels', {
        method: 'GET',
        headers: getHeaders(),
      }),
    analyze: <T>(data: {
      funnelName: 'signup' | 'video_watch' | 'creator_conversion' | 'subscription' | 'content_upload';
      startDate: string;
      endDate: string;
      userId?: string;
    }) =>
      apiRequest<T>('/api/funnel-analytics/analyze', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    analyzeMultiple: <T>(data: {
      funnelNames: Array<'signup' | 'video_watch' | 'creator_conversion' | 'subscription' | 'content_upload'>;
      startDate: string;
      endDate: string;
      userId?: string;
    }) =>
      apiRequest<T>('/api/funnel-analytics/analyze-multiple', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getSummary: <T>(funnelName: string, params: { startDate: string; endDate: string }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('startDate', params.startDate);
      searchParams.append('endDate', params.endDate);
      return apiRequest<T>(`/api/funnel-analytics/summary/${funnelName}?${searchParams.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    compare: <T>(data: {
      funnelName: 'signup' | 'video_watch' | 'creator_conversion' | 'subscription' | 'content_upload';
      period1Start: string;
      period1End: string;
      period2Start: string;
      period2End: string;
    }) =>
      apiRequest<T>('/api/funnel-analytics/compare', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
  },
  bundles: {
    getAll: <T>(params?: { creatorId?: string; isActive?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.creatorId) searchParams.append('creatorId', params.creatorId);
      if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      const query = searchParams.toString();
      const url = `/api/bundles${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    get: <T>(id: string) =>
      apiRequest<T>(`/api/bundles/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    create: <T>(data: {
      title: string;
      description?: string;
      thumbnail?: string | null;
      contentIds: string[];
      price: number;
      expiresAt?: string | null;
    }) =>
      apiRequest<T>('/api/bundles', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    update: <T>(id: string, data: {
      title?: string;
      description?: string | null;
      thumbnail?: string | null;
      price?: number;
      isActive?: boolean;
      expiresAt?: string | null;
    }) =>
      apiRequest<T>(`/api/bundles/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/bundles/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    purchase: <T>(id: string, data?: { paymentProvider?: string; paymentId?: string }) =>
      apiRequest<T>(`/api/bundles/${id}/purchase`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      }),
  },
};

