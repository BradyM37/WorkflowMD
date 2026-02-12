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

export interface GHLLocation {
  id: string;
  name: string;
  companyName?: string;
  address?: string;
  connectedAt?: Date;
}

export type PlanType = 'free' | 'pro' | 'agency';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscription: PlanType;
  planType: PlanType;
  locationId: string | null;
  currentLocationId: string | null;
  locations: GHLLocation[];
  ghlConnected: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  switchLocation: (locationId: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
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
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<GHLLocation[]>([]);
  const [ghlConnected, setGhlConnected] = useState(false);

  // planType is an alias for subscription for cleaner API
  const planType = subscription;

  const refreshLocations = async () => {
    try {
      const response = await api.get('/api/locations');
      if (response.data.success) {
        setLocations(response.data.data.locations || []);
        setCurrentLocationId(response.data.data.currentLocationId || null);
        setLocationId(response.data.data.currentLocationId || null);
      }
    } catch (error) {
      console.error('Failed to refresh locations:', error);
    }
  };

  const switchLocation = async (newLocationId: string) => {
    try {
      const response = await api.post('/api/locations/switch', { locationId: newLocationId });
      if (response.data.success) {
        setCurrentLocationId(newLocationId);
        setLocationId(newLocationId);
        // Trigger a page reload to refresh data for new location
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch location:', error);
      throw error;
    }
  };

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
        setCurrentLocationId(response.data.data.locationId || null);
        setGhlConnected(response.data.data.ghlConnected || false);
        
        // Fetch locations if GHL is connected
        if (response.data.data.ghlConnected) {
          await refreshLocations();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSubscription('free');
        setLocationId(null);
        setCurrentLocationId(null);
        setLocations([]);
        setGhlConnected(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setSubscription('free');
      setLocationId(null);
      setCurrentLocationId(null);
      setLocations([]);
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
      setCurrentLocationId(null);
      setLocations([]);
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
        currentLocationId,
        locations,
        ghlConnected,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        checkAuth,
        switchLocation,
        refreshLocations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
