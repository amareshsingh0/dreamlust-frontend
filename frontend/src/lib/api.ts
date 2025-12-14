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
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

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
      return {
        success: false,
        error: data.error || {
          code: 'UNKNOWN_ERROR',
          message: data.message || 'An error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error: any) {
    // Handle fetch errors (network failures, CORS, etc.)
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to fetch. Please check your connection and ensure the server is running.',
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
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...customHeaders,
  };
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
    confirmPayment: <T>(tipId: string, data: { paymentIntentId: string; paymentMethodId?: string }) =>
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
      const queryString = searchParams.toString();
      const url = `/api/earnings${queryString ? `?${queryString}` : ''}`;
      return apiRequest<T>(url, {
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
};

