import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

export interface TwoFactorRequired {
  requires2FA: true;
  pendingToken: string;
  methods: ('totp' | 'email')[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<TwoFactorRequired | void>;
  ldapLogin: (username: string, password: string) => Promise<TwoFactorRequired | void>;
  verify2FA: (pendingToken: string, code: string, method?: 'totp' | 'email') => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then(res => setUser(res.data.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const completeLogin = (data: { user: User; accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const login = async (username: string, password: string): Promise<TwoFactorRequired | void> => {
    const response = await authApi.login(username, password);
    const data = response.data.data as any;

    if (data.requires2FA) {
      return {
        requires2FA: true,
        pendingToken: data.pendingToken,
        methods: data.methods || [data.method],
      };
    }

    completeLogin(data);
  };

  const ldapLogin = async (username: string, password: string): Promise<TwoFactorRequired | void> => {
    const response = await authApi.ldapLogin(username, password);
    const data = response.data.data as any;

    if (data.requires2FA) {
      return {
        requires2FA: true,
        pendingToken: data.pendingToken,
        methods: data.methods || [data.method],
      };
    }

    completeLogin(data);
  };

  const verify2FA = async (pendingToken: string, code: string, method?: 'totp' | 'email'): Promise<void> => {
    const response = await authApi.verify2FA(pendingToken, code, method);
    const data = response.data.data;
    completeLogin(data);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await authApi.register(username, email, password);
    const { user, accessToken, refreshToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // Check if user has admin-level permissions
  const isAdmin = user?.role?.name === 'Admin' ||
    user?.role?.permissions?.includes('users:create') || false;

  // Check if user has manager-level permissions
  const isManager = isAdmin ||
    user?.role?.name === 'Manager' ||
    user?.role?.permissions?.includes('items:delete') || false;

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return user?.role?.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, ldapLogin, verify2FA, register, logout, isAdmin, isManager, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
