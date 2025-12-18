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
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
                // Token invalid, clear everything
                clearAuth();
              }
            })
            .catch((error) => {
              // API not available or error - keep using stored user
              console.warn('Failed to verify token with backend:', error);
              // Don't clear auth if API is unavailable - user might be offline
              // Only clear if it's an authentication error
              if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
                clearAuth();
              }
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
      if (response.data.user && response.data.tokens?.accessToken) {
        // Standard structure: { user: {...}, tokens: { accessToken: ... } }
        userData = response.data.user;
        accessToken = response.data.tokens.accessToken;
      } else if (response.data.id && response.data.email) {
        // Direct user object with token
        userData = response.data as User;
        accessToken = (response.data as any).accessToken || (response.data as any).token;
      } else {
        // Fallback: check if data itself is the user object
        console.warn('⚠️ Unexpected response structure, attempting to parse:', response.data);
        userData = (response.data as any).user || response.data as User;
        accessToken = (response.data as any).tokens?.accessToken || (response.data as any).accessToken;
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

  const register = async (email: string, username: string, password: string, displayName?: string) => {
    try {
      const response = await api.auth.register<{
        user: User;
        tokens: {
          accessToken: string;
        };
      }>({ email, username, password, displayName });

      if (response.success && response.data) {
        // Handle response structure: { user: {...}, tokens: {...} }
        const userData = response.data.user;
        const accessToken = response.data.tokens?.accessToken;
        
        if (!userData || !accessToken) {
          console.error('Invalid response structure:', response.data);
          throw new Error('Invalid response format from server');
        }
        
        // Store tokens and user
        authStorage.setAccessToken(accessToken);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
