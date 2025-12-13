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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: true,
    data: data.data || data,
  };
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
};

