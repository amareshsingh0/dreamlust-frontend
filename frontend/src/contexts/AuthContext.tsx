import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { setDatadogUser, clearDatadogUser } from '@/lib/monitoring/datadog';

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
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');
        
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Verify token is still valid by checking with backend
          try {
            const response = await api.auth.me<{ user: User }>();
            if (response.success && response.data) {
              // Response structure: { user: {...} } or just user object
              const userData = response.data.user || response.data;
              if (userData && userData.id) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              } else {
                // Invalid user data, clear everything
                clearAuth();
              }
            } else {
              // Token invalid, clear everything
              clearAuth();
            }
          } catch (error) {
            // Network error or invalid token - clear auth
            console.warn('Token validation failed:', error);
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    setUser(null);
    
    // Clear user in Datadog
    clearDatadogUser();
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await api.auth.login<{
        user: User;
        tokens: {
          accessToken: string;
        };
      }>({ email, password, rememberMe });

      if (response.success && response.data) {
        // Handle response structure: { user: {...}, tokens: {...} }
        const userData = response.data.user;
        const accessToken = response.data.tokens?.accessToken;
        
        if (!userData || !accessToken) {
          console.error('Invalid response structure:', response.data);
          throw new Error('Invalid response format from server');
        }
        
        // Store tokens and user
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        // Set user in Datadog
        setDatadogUser({
          id: userData.id,
          email: userData.email,
          username: userData.username,
        });
      } else {
        const errorMsg = response.error?.message || 'Login failed';
        console.error('Login failed:', response.error);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      clearAuth();
      throw error;
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
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        // Set user in Datadog
        setDatadogUser({
          id: userData.id,
          email: userData.email,
          username: userData.username,
        });
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
    const token = localStorage.getItem('accessToken');
    
    // Clear local state immediately (don't wait for API)
    clearAuth();
    
    // Try to call logout API (non-blocking) if we had a token
    if (token) {
      try {
        // Fire and forget - don't wait for response
        api.auth.logout().catch((error) => {
          console.warn('Logout API call failed (non-blocking):', error);
        });
      } catch (error) {
        console.warn('Logout API error:', error);
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
          localStorage.setItem('user', JSON.stringify(userData));
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
