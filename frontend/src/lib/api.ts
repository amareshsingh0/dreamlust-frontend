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

export const api = {
  search: {
    post: <T>(body: unknown) =>
      apiRequest<T>('/api/search', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};

