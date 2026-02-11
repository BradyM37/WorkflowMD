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

export type PlanType = 'free' | 'pro' | 'agency';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscription: PlanType;
  planType: PlanType;
  locationId: string | null;
  ghlConnected: boolean;
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
  const [subscription, setSubscription] = useState<PlanType>('free');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [ghlConnected, setGhlConnected] = useState(false);

  // planType is an alias for subscription for cleaner API
  const planType = subscription;

  const checkAuth = async () => {
    setIsLoading(true);
    
    try {
      const response = await api.get('/auth/status');
      if (response.data.success && response.data.data.authenticated) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        // Support both planType and subscription from backend
        const plan = response.data.data.planType || response.data.data.subscription || 'free';
        setSubscription(plan as PlanType);
        setLocationId(response.data.data.locationId || null);
        setGhlConnected(response.data.data.ghlConnected || false);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSubscription('free');
        setLocationId(null);
        setGhlConnected(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setSubscription('free');
      setLocationId(null);
      setGhlConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    
    if (response.data.success) {
      // Store token in localStorage for cross-domain auth
      if (response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      
      setUser(response.data.data.user);
      setIsAuthenticated(true);
      const plan = response.data.data.planType || response.data.data.subscription || 'free';
      setSubscription(plan as PlanType);
      setLocationId(response.data.data.locationId || null);
      setGhlConnected(response.data.data.ghlConnected || false);
    } else {
      throw new Error(response.data.error?.message || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
    
    // After registration, store token and set user
    if (response.data.data.token) {
      localStorage.setItem('auth_token', response.data.data.token);
    }
    
    if (response.data.data.user) {
      setUser(response.data.data.user);
      setIsAuthenticated(true);
      setSubscription('free');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear stored token
      localStorage.removeItem('auth_token');
      
      setUser(null);
      setIsAuthenticated(false);
      setSubscription('free');
      setLocationId(null);
      setGhlConnected(false);
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send reset email');
    }
  };

  const resetPassword = async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to reset password');
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
        planType,
        locationId,
        ghlConnected,
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
