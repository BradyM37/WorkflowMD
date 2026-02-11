import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  emailVerified: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscription: 'free' | 'pro';
  locationId: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<'free' | 'pro'>('free');
  const [locationId, setLocationId] = useState<string | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    
    // Check for demo mode first
    const demoMode = localStorage.getItem('demo_mode');
    if (demoMode === 'true') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        setSubscription('pro');
        setLocationId(localStorage.getItem('location_id') || 'demo_location');
        setIsLoading(false);
        return;
      }
    }
    
    try {
      const response = await api.get('/auth/status');
      setUser(response.data.user);
      setIsAuthenticated(response.data.authenticated);
      setSubscription(response.data.subscription || 'free');
      setLocationId(response.data.locationId);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setSubscription('free');
      setLocationId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Mock API call for demo
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        emailVerified: true
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', 'mock_jwt_token');
      localStorage.setItem('demo_mode', 'true');
      
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      }

      setUser(mockUser);
      setIsAuthenticated(true);
      
      // In production, this would be:
      // const response = await api.post('/auth/login', { email, password, rememberMe });
      // setUser(response.data.user);
      // setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid email or password');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      // Mock API call for demo
      const newUser: User = {
        id: Date.now().toString(),
        email: data.email,
        name: data.name,
        companyName: data.companyName,
        emailVerified: false
      };

      localStorage.setItem('pending_user', JSON.stringify(newUser));
      
      // In production, this would be:
      // const response = await api.post('/auth/register', data);
      // localStorage.setItem('pending_user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed. Please try again.');
    }
  };

  const logout = () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      setSubscription('free');
      setLocationId(null);
      
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('demo_mode');
      localStorage.removeItem('location_id');
      localStorage.removeItem('remember_me');
      
      // In production:
      // await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      // Mock API call
      console.log('Password reset email sent to:', email);
      localStorage.setItem('reset_email', email);
      
      // In production:
      // await api.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new Error('Failed to send reset email. Please try again.');
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      // Mock API call
      console.log('Password reset for token:', token);
      
      // In production:
      // await api.post('/auth/reset-password', { token, password });
    } catch (error) {
      console.error('Reset password error:', error);
      throw new Error('Failed to reset password. Token may be invalid or expired.');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        subscription,
        locationId,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
