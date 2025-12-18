import { authStorage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// CSRF Token Management
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const url = `${API_BASE_URL}/api/auth/csrf-token`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    if (data.success && data.data?.csrfToken) {
      csrfToken = data.data.csrfToken;
      return csrfToken;
    }
    throw new Error('Invalid CSRF token response');
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to fetch CSRF token:', error);
    }
    throw error;
  }
}

// Get CSRF token, fetching if needed (with deduplication)
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  // Prevent multiple simultaneous fetches
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetchCsrfToken().finally(() => {
    csrfTokenPromise = null;
  });

  return csrfTokenPromise;
}

// Clear CSRF token (called on CSRF errors or logout)
export function clearCsrfToken(): void {
  csrfToken = null;
}

// Refresh CSRF token
export async function refreshCsrfToken(): Promise<string> {
  csrfToken = null;
  return getCsrfToken();
}

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
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = options.body instanceof FormData;
    const defaultHeaders: Record<string, string> = isFormData
      ? {}
      : { 'Content-Type': 'application/json' };
    
    const fetchOptions: RequestInit = {
      ...options,
      signal: options.signal || controller.signal, // Use provided signal or create new one
      credentials: options.credentials || 'include', // Include cookies for auth
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // Check if it's an abort error
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      throw fetchError;
    }

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
    
    return {
      success: true,
      data: extractedData,
    };
  } catch (error: any) {
    // Handle fetch errors (network failures, CORS, etc.)
    let errorMessage = 'Failed to fetch. ';
    
    // Check for abort/timeout errors
    if (error.message?.includes('aborted') || error.message?.includes('timeout') || error.name === 'AbortError') {
      errorMessage = 'Request timeout. Please check your connection and ensure the backend server is running at ' + API_BASE_URL;
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage += 'Please ensure the backend server is running at ' + API_BASE_URL;
    } else if (error.message?.includes('CORS')) {
      errorMessage += 'CORS error. Please check server configuration.';
    } else {
      errorMessage += error.message || 'Please check your connection and ensure the server is running.';
    }
    
    // Only log errors in development to avoid console errors in production (best practices)
    if (import.meta.env.DEV) {
      console.error('API Request Error:', {
        url,
        error: error.message,
        stack: error.stack,
      });
    }
    
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
  // Use safe storage wrapper to handle private browsing mode
  return authStorage.getAccessToken();
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

// Helper to add auth headers WITH CSRF token (for state-changing requests)
async function getHeadersWithCsrf(customHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = getAuthToken();
  const csrf = await getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
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
    // Autocomplete suggestions
    autocomplete: <T>(query: string, limit?: number) => {
      const searchParams = new URLSearchParams();
      searchParams.append('q', query);
      if (limit) searchParams.append('limit', limit.toString());
      return apiRequest<T>(`/api/search/autocomplete?${searchParams.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Get trending searches
    getTrending: <T>(params?: { limit?: number; days?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.days) searchParams.append('days', params.days.toString());
      const query = searchParams.toString();
      return apiRequest<T>(`/api/search/trending${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Track search result click
    trackClick: <T>(data: { query: string; resultId: string; timeToClick?: number }) =>
      apiRequest<T>('/api/search/track-click', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
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
      const csrf = await getCsrfToken();
      const url = `${API_BASE_URL}/api/upload/content`;

      try {
        const headers: Record<string, string> = {
          'X-CSRF-Token': csrf,
        };
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
    create: async <T>(data: { contentId: string; text: string; parentId?: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>('/api/comments', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    update: async <T>(id: string, data: { text: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/comments/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
    },
    delete: async <T>(id: string) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/comments/${id}`, {
        method: 'DELETE',
        headers,
      });
    },
    like: async <T>(id: string, type: 'like' | 'dislike') => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/comments/${id}/like`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type }),
      });
    },
    pin: async <T>(id: string) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/comments/${id}/pin`, {
        method: 'POST',
        headers,
      });
    },
    report: async <T>(id: string, data: { reason: string; type?: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/comments/${id}/report`, {
        method: 'POST',
        headers,
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
    updateReport: async <T>(id: string, data: {
      status?: string;
      action?: string;
      moderatorNotes?: string;
    }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/moderation/reports/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
    },
    resolveReport: async <T>(id: string, data: {
      status: string;
      action?: string;
      moderatorNotes?: string;
    }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/moderation/reports/${id}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    getStats: <T>() =>
      apiRequest<T>('/api/moderation/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
  },
  admin: {
    // Dashboard
    getDashboardStats: <T>() =>
      apiRequest<T>('/api/admin/dashboard/stats', {
        method: 'GET',
        headers: getHeaders(),
      }),
    getDashboardCharts: <T>(params?: { period?: '7d' | '30d' | '90d' }) => {
      const searchParams = new URLSearchParams();
      if (params?.period) searchParams.append('period', params.period);
      const queryString = searchParams.toString();
      const url = `/api/admin/dashboard/charts${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getDashboardActivity: <T>(params?: { limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/admin/dashboard/activity${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Users
    getUsers: <T>(params?: {
      search?: string;
      status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE';
      role?: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.role) searchParams.append('role', params.role);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getUser: <T>(id: string) =>
      apiRequest<T>(`/api/admin/users/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    updateUser: async <T>(id: string, data: {
      role?: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
      status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE';
      email?: string;
      username?: string;
    }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
    },
    suspendUser: async <T>(id: string, data?: { reason?: string; duration?: number }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/users/${id}/suspend`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data || {}),
      });
    },
    banUser: async <T>(id: string, data?: { reason?: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/users/${id}/ban`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data || {}),
      });
    },
    impersonateUser: async <T>(id: string) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/users/${id}/impersonate`, {
        method: 'POST',
        headers,
      });
    },
    // Content
    getContent: <T>(params?: {
      status?: string;
      type?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.type) searchParams.append('type', params.type);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const queryString = searchParams.toString();
      const url = `/api/admin/content${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    removeContent: async <T>(id: string, data?: { reason?: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/content/${id}/remove`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data || {}),
      });
    },
    // Creators
    warnCreator: async <T>(id: string, data: { reason: string; severity?: 'low' | 'medium' | 'high' }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/creators/${id}/warn`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    // Moderation
    autoModerate: async <T>(contentId: string) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>(`/api/admin/moderation/auto-moderate/${contentId}`, {
        method: 'POST',
        headers,
      });
    },
    // Export (direct download URLs)
    exportUsersCSV: (params?: { status?: string; role?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.role) searchParams.append('role', params.role);
      return `${API_BASE_URL}/api/admin/export/users/csv?${searchParams.toString()}`;
    },
    exportUsersExcel: (params?: { status?: string; role?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.role) searchParams.append('role', params.role);
      return `${API_BASE_URL}/api/admin/export/users/excel?${searchParams.toString()}`;
    },
    exportContentCSV: (params?: { status?: string; type?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.type) searchParams.append('type', params.type);
      return `${API_BASE_URL}/api/admin/export/content/csv?${searchParams.toString()}`;
    },
    exportContentExcel: (params?: { status?: string; type?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.type) searchParams.append('type', params.type);
      return `${API_BASE_URL}/api/admin/export/content/excel?${searchParams.toString()}`;
    },
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
        credentials: 'include', // Important for cookies
      }),
    logout: async <T>() => {
      const headers = await getHeadersWithCsrf();
      const result = await apiRequest<T>('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      // Clear CSRF token on logout
      clearCsrfToken();
      return result;
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
    changePassword: async <T>(data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>('/api/auth/change-password', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    // Password Reset
    requestPasswordReset: <T>(data: { email: string }) =>
      apiRequest<T>('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    verifyResetToken: <T>(data: { token: string }) =>
      apiRequest<T>('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    resetPassword: <T>(data: { token: string; password: string }) =>
      apiRequest<T>('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    // 2FA (Two-Factor Authentication)
    generate2FA: <T>() =>
      apiRequest<T>('/api/auth/2fa/generate', {
        method: 'GET',
        headers: getHeaders(),
      }),
    enable2FA: async <T>(data: { token: string; secret: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>('/api/auth/2fa/enable', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    disable2FA: async <T>(data: { token: string }) => {
      const headers = await getHeadersWithCsrf();
      return apiRequest<T>('/api/auth/2fa/disable', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    },
    verify2FA: <T>(data: { token: string }) =>
      apiRequest<T>('/api/auth/2fa/verify', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    verify2FALogin: <T>(data: { userId: string; token: string; rememberMe?: boolean }) =>
      apiRequest<T>('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
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
    uploadScreenshot: <T>(file: File) => {
      const formData = new FormData();
      formData.append('screenshot', file);
      
      // Get auth token for Authorization header
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      return apiRequest<T>('/api/feedback/screenshot', {
        method: 'POST',
        headers,
        body: formData,
      });
    },
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
    create: <T>(data: {
      title: string;
      description: string;
      thumbnail?: string;
      contentIds: string[];
      price: number;
      expiresAt?: string | null;
    }) =>
      apiRequest<T>('/api/bundles', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getAll: <T>(params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      return apiRequest<T>(`/api/bundles${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    get: <T>(id: string) =>
      apiRequest<T>(`/api/bundles/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    purchase: <T>(id: string, data?: { paymentMethodId?: string }) =>
      apiRequest<T>(`/api/bundles/${id}/purchase`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      }),
  },
  experiments: {
    // Get all active experiments
    getActive: <T>() =>
      apiRequest<T>('/api/experiments/active', {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Get experiment by ID
    get: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Get user's assigned variant for an experiment
    getVariant: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}/variant`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Assign user to experiment variant (or get existing assignment)
    assign: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}/assign`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    // Admin endpoints
    create: <T>(data: {
      name: string;
      description?: string;
      hypothesis: string;
      variants: Array<{ name: string; weight: number }>;
      metrics: string[];
      startDate?: string;
      endDate?: string;
    }) =>
      apiRequest<T>('/api/experiments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getAll: <T>(params?: { status?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      return apiRequest<T>(`/api/experiments${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    start: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}/start`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    pause: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}/pause`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    complete: <T>(id: string, analyzeResults?: boolean) =>
      apiRequest<T>(`/api/experiments/${id}/complete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ analyzeResults }),
      }),
    getResults: <T>(id: string) =>
      apiRequest<T>(`/api/experiments/${id}/results`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Assign by experiment name (for useExperiment hook)
    assignByName: <T>(experimentName: string) =>
      apiRequest<T>('/api/experiments/assign', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ experiment: experimentName }),
      }),
    // Track experiment metric
    track: <T>(experimentName: string, metric: string, value: number) =>
      apiRequest<T>('/api/experiments/track', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ experiment: experimentName, metric, value }),
      }),
  },
  features: {
    // Get feature flag by key
    get: <T>(key: string) =>
      apiRequest<T>(`/api/features/${key}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Get all feature flags (admin only)
    getAll: <T>(params?: { enabledOnly?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.enabledOnly) searchParams.append('enabledOnly', 'true');
      const query = searchParams.toString();
      return apiRequest<T>(`/api/features${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Create or update feature flag (admin only)
    upsert: <T>(data: {
      key: string;
      name: string;
      description?: string;
      enabled: boolean;
      rolloutPercentage?: number;
      targetUsers?: string[];
      targetRoles?: string[];
    }) =>
      apiRequest<T>('/api/features', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    // Toggle feature flag (admin only)
    toggle: <T>(key: string, enabled: boolean) =>
      apiRequest<T>(`/api/features/${key}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ enabled }),
      }),
    // Delete feature flag (admin only)
    delete: <T>(key: string) =>
      apiRequest<T>(`/api/features/${key}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
  },
  savedSearches: {
    // Get all saved searches
    getAll: <T>() =>
      apiRequest<T>('/api/saved-searches', {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Create saved search
    create: <T>(data: {
      query: string;
      filters?: Record<string, unknown>;
      name?: string;
      notifyOnNew?: boolean;
    }) =>
      apiRequest<T>('/api/saved-searches', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    // Update saved search
    update: <T>(id: string, data: {
      name?: string;
      notifyOnNew?: boolean;
      filters?: Record<string, unknown>;
    }) =>
      apiRequest<T>(`/api/saved-searches/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    // Delete saved search
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
  },
  social: {
    // Follow a user
    follow: <T>(followingId: string, followingType?: 'user' | 'creator') =>
      apiRequest<T>('/api/social/follow', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ followingId, followingType }),
      }),
    // Unfollow a user
    unfollow: <T>(followingId: string) =>
      apiRequest<T>(`/api/social/follow/${followingId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    // Check if following
    isFollowing: <T>(followingId: string) =>
      apiRequest<T>(`/api/social/follow/${followingId}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Get followers
    getFollowers: <T>(userId: string, limit?: number, offset?: number) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      return apiRequest<T>(`/api/social/followers/${userId}?${params}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Get following
    getFollowing: <T>(userId: string, limit?: number, offset?: number) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      return apiRequest<T>(`/api/social/following/${userId}?${params}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Get activity feed
    getActivityFeed: <T>(type?: string, limit?: number, offset?: number) => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      return apiRequest<T>(`/api/social/activity-feed?${params}`, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Get OG tags
    getOGTags: <T>(contentId: string) =>
      apiRequest<T>(`/api/social/share/${contentId}/og-tags`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Get share URL
    getShareUrl: <T>(contentId: string, platform?: string) => {
      const url = platform
        ? `/api/social/share/${contentId}/url?platform=${platform}`
        : `/api/social/share/${contentId}/url`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    // Get embed code
    getEmbedCode: <T>(contentId: string) =>
      apiRequest<T>(`/api/social/share/${contentId}/embed`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    // Track share
    trackShare: <T>(contentId: string, platform?: string) =>
      apiRequest<T>(`/api/social/share/${contentId}/track`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ platform }),
      }),
    // Collections
    createCollection: <T>(data: {
      name: string;
      description?: string;
      isPublic?: boolean;
      isCollaborative?: boolean;
      contributors?: string[];
      thumbnailUrl?: string;
    }) =>
      apiRequest<T>('/api/social/collections', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    getCollection: <T>(id: string) =>
      apiRequest<T>(`/api/social/collections/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    addToCollection: <T>(collectionId: string, contentId: string, note?: string) =>
      apiRequest<T>(`/api/social/collections/${collectionId}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contentId, note }),
      }),
    removeFromCollection: <T>(collectionId: string, contentId: string) =>
      apiRequest<T>(`/api/social/collections/${collectionId}/items/${contentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    getFeaturedCollections: <T>(limit?: number) => {
      const url = limit
        ? `/api/social/collections/featured?limit=${limit}`
        : '/api/social/collections/featured';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getTrendingCollections: <T>(limit?: number) => {
      const url = limit
        ? `/api/social/collections/trending?limit=${limit}`
        : '/api/social/collections/trending';
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    followCollection: <T>(collectionId: string) =>
      apiRequest<T>(`/api/social/collections/${collectionId}/follow`, {
        method: 'POST',
        headers: getHeaders(),
      }),
    addContributor: <T>(collectionId: string, contributorId: string) =>
      apiRequest<T>(`/api/social/collections/${collectionId}/contributors`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contributorId }),
      }),
  },
  downloads: {
    create: <T>(data: { contentId: string; quality?: string; expiresInDays?: number }) =>
      apiRequest<T>('/api/downloads', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }),
    get: <T>(params?: { status?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = `/api/downloads${query ? `?${query}` : ''}`;
      return apiRequest<T>(url, {
        method: 'GET',
        headers: getHeaders(),
      });
    },
    getById: <T>(id: string) =>
      apiRequest<T>(`/api/downloads/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    getUrl: <T>(id: string) =>
      apiRequest<T>(`/api/downloads/${id}/url`, {
        method: 'GET',
        headers: getHeaders(),
      }),
    cancel: <T>(id: string) =>
      apiRequest<T>(`/api/downloads/${id}?action=cancel`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
    delete: <T>(id: string) =>
      apiRequest<T>(`/api/downloads/${id}?action=delete`, {
        method: 'DELETE',
        headers: getHeaders(),
      }),
  },
};

