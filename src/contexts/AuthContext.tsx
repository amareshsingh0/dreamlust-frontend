import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { authStorage, getObject, setObject } from '@/lib/storage';
// Datadog removed - using Sentry instead
// import { setDatadogUser, clearDatadogUser } from '@/lib/monitoring/datadog';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  displayName?: string;
  display_name?: string; // Backend uses snake_case
  avatar?: string;
  banner?: string;
  bio?: string;
  isCreator?: boolean;
  website?: string;
  socialLinks?: Record<string, string>;
  followingCount?: number;
  createdAt?: string;
  creator?: {
    banner?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isCreator: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, username: string, password: string, birthDate?: string, displayName?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to refresh the access token using refresh token
  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      // Get stored refresh token to send in body (httpOnly cookie is also sent)
      const storedRefreshToken = authStorage.getRefreshToken();

      const response = await api.auth.refresh<{
        accessToken: string;
        refreshToken?: string;
        user?: User;
      }>(storedRefreshToken || undefined);

      if (response.success && response.data) {
        const newToken = response.data.accessToken;
        if (newToken) {
          authStorage.setAccessToken(newToken);
          // Update refresh token if a new one is provided
          if (response.data.refreshToken) {
            authStorage.setRefreshToken(response.data.refreshToken);
          }
          // If user data is returned, update it
          if (response.data.user) {
            setUser(response.data.user);
            setObject('user', response.data.user);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = getObject<User>('user');
        const token = authStorage.getAccessToken();

        if (storedUser && token) {
          // Set user immediately to prevent blank screen
          setUser(storedUser);
          setIsLoading(false);

          // Verify token is still valid by checking with backend (non-blocking)
          // Don't block UI if API is not available
          api.auth.me<{ user: User }>()
            .then((response) => {
              if (response.success && response.data) {
                // Response structure: { user: {...} } or just user object
                const userData = response.data.user || response.data;
                if (userData && userData.id) {
                  setUser(userData);
                  setObject('user', userData);
                } else {
                  // Invalid user data, clear everything
                  clearAuth();
                }
              } else {
                // Token might be expired, try to refresh it
                tryRefreshToken().then((refreshed) => {
                  if (!refreshed) {
                    clearAuth();
                  }
                });
              }
            })
            .catch(async (error) => {
              // API not available or error - check if it's a token expiry issue
              console.warn('Failed to verify token with backend:', error);
              const errorMsg = error?.message || '';

              // If token expired or unauthorized, try to refresh
              if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') ||
                  errorMsg.includes('expired') || errorMsg.includes('Token')) {
                const refreshed = await tryRefreshToken();
                if (!refreshed) {
                  clearAuth();
                }
              }
              // For other errors (network issues, etc.), keep using stored user
            });
        } else if (storedUser) {
          // Have stored user but no token - try to refresh
          setUser(storedUser);
          setIsLoading(false);
          tryRefreshToken().catch(() => {
            // Refresh failed silently - user will be asked to login on next action
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setIsLoading(false);
        // Don't clear auth on error - might be network issue
      }
    };

    loadUser();
  }, []);

  const clearAuth = () => {
    authStorage.clearTokens();
    // Remove user from localStorage
    try {
      localStorage.removeItem('user');
    } catch {
      // Ignore storage errors
    }
    // Note: sessionStorage.clear() is safe and doesn't need wrapper
    sessionStorage.clear();
    setUser(null);

    // Datadog removed - using Sentry instead
    // clearDatadogUser();
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // API request timeout is handled by api.ts (15 seconds)
      const response = await api.auth.login<{
        user: User;
        tokens: {
          accessToken: string;
        };
      }>({ email, password, rememberMe });

      // Check if response is successful
      if (!response.success) {
        const errorMsg = response.error?.message || response.error?.code || 'Login failed';
        console.error('❌ Login failed:', response.error);
        throw new Error(errorMsg);
      }

      // Validate response data exists
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Invalid response from server: No data received');
      }

      // Handle different response structures
      // Backend returns: { success: true, data: { user: {...}, tokens: { accessToken: ... } } }
      // apiRequest extracts: data.data, so we get: { user: {...}, tokens: { accessToken: ... } }
      let userData: User | null = null;
      let accessToken: string | null = null;

      // Try to extract user and token from response
      const data = response.data as any;
      let refreshToken: string | null = null;

      if (data.user && data.tokens?.accessToken) {
        // Standard structure: { user: {...}, tokens: { accessToken: ..., refreshToken: ... } }
        userData = data.user;
        accessToken = data.tokens.accessToken;
        refreshToken = data.tokens.refreshToken || null;
      } else if (data.id && data.email) {
        // Direct user object with token
        userData = data as User;
        accessToken = data.accessToken || data.token;
        refreshToken = data.refreshToken || null;
      } else {
        // Fallback: check if data itself is the user object
        console.warn('⚠️ Unexpected response structure, attempting to parse:', data);
        userData = data.user || data as User;
        accessToken = data.tokens?.accessToken || data.accessToken;
        refreshToken = data.tokens?.refreshToken || data.refreshToken || null;
      }
      
      // Validate we have both user and token
      if (!userData || !userData.id || !userData.email) {
        console.error('❌ Invalid user data in response:', response.data);
        throw new Error('Invalid response format: Missing user information');
      }
      
      if (!accessToken) {
        console.error('❌ Missing access token in response:', response.data);
        throw new Error('Invalid response format: Missing access token');
      }
      
      // Store tokens and user atomically
      try {
        authStorage.setAccessToken(accessToken);
        if (refreshToken) {
          authStorage.setRefreshToken(refreshToken);
        }
        setObject('user', userData);
        setUser(userData);
      } catch (storageError) {
        console.error('❌ Failed to store auth data:', storageError);
        throw new Error('Failed to save login information. Please try again.');
      }
      
      // Datadog removed - using Sentry instead
      // User tracking is handled by Sentry automatically
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      // Don't clear auth on error - let the user try again
      // clearAuth();
      
      // Re-throw with a user-friendly message
      if (error.message) {
        throw error;
      } else {
        throw new Error('Login failed. Please check your credentials and try again.');
      }
    }
  };

  const register = async (email: string, username: string, password: string, birthDate?: string, displayName?: string) => {
    try {
      const response = await api.auth.register<{
        user: User;
        tokens: {
          accessToken: string;
          refreshToken?: string;
        };
      }>({ email, username, password, birthDate, displayName });

      if (response.success && response.data) {
        // Handle response structure: { user: {...}, tokens: {...} }
        const userData = response.data.user;
        const accessToken = response.data.tokens?.accessToken;
        const refreshToken = response.data.tokens?.refreshToken;

        if (!userData || !accessToken) {
          console.error('Invalid response structure:', response.data);
          throw new Error('Invalid response format from server');
        }

        // Store tokens and user
        authStorage.setAccessToken(accessToken);
        if (refreshToken) {
          authStorage.setRefreshToken(refreshToken);
        }
        setObject('user', userData);
        setUser(userData);

        // Datadog removed - using Sentry instead
        // User tracking is handled by Sentry automatically
      } else {
        const errorMsg = response.error?.message || 'Registration failed';
        console.error('Registration failed:', response.error);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      clearAuth();
      throw error;
    }
  };

  const logout = async () => {
    // Get token before clearing
    const token = authStorage.getAccessToken();
    
    // Clear local state immediately (don't wait for API)
    clearAuth();
    
    // Try to call logout API (non-blocking) if we had a token
    if (token) {
      try {
        // Fire and forget - don't wait for response
        api.auth.logout()
          .catch((error) => {
            if (import.meta.env.DEV) {
              console.warn('Logout API call failed (non-blocking):', error);
            }
          });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Logout API error:', error);
        }
      }
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.auth.me<{ user: User }>();
      if (response.success && response.data) {
        // Response structure: { user: {...} } or just user object
        const userData = response.data.user || response.data;
        if (userData && userData.id) {
          setUser(userData);
          setObject('user', userData);
        } else {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      clearAuth();
    }
  };

  // Derived value for creator check
  const isCreator = !!(user?.isCreator || user?.role === 'creator');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isCreator,
        isLoading,
        login,
        logout,
        register,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
