import { createContext, useEffect, useState, type ReactNode } from 'react';
import * as api from '../lib/api';
import type { User } from '../lib/api';

// ============================================================================
// Context shape
// ============================================================================

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from stored token
  useEffect(() => {
  let cancelled = false;

  const restoreSession = async () => {
    const token = api.getStoredToken();

    if (!token) {
      if (!cancelled) setIsLoading(false);
      return;
    }

    try {
      const { user } = await api.getMe();
      if (!cancelled) setUser(user);
    } catch {
      if (!cancelled) api.logout();
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };

  restoreSession();

  return () => {
    cancelled = true;
  };
}, []);



  const login = async (email: string, password: string) => {
    const { user } = await api.login(email, password);
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { user } = await api.register(name, email, password);
    setUser(user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}