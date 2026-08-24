import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from './api';
import type { ProfessionalPrivate, SessionUser } from './types';

interface SessionResponse {
  token?: string;
  user: SessionUser;
  professional: ProfessionalPrivate | null;
}

interface AuthState {
  user: SessionUser | null;
  professional: ProfessionalPrivate | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  signup: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<SessionUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [professional, setProfessional] = useState<ProfessionalPrivate | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setProfessional(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<SessionResponse>('/auth/me');
      setUser(data.user);
      setProfessional(data.professional);
    } catch {
      setToken(null);
      setUser(null);
      setProfessional(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const adopt = (data: SessionResponse): SessionUser => {
    if (data.token) setToken(data.token);
    setUser(data.user);
    setProfessional(data.professional);
    return data.user;
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      professional,
      loading,
      refresh,
      login: async (email, password) =>
        adopt(await api<SessionResponse>('/auth/login', { body: { email, password } })),
      signup: async (input) => adopt(await api<SessionResponse>('/auth/signup', { body: input })),
      logout: () => {
        setToken(null);
        setUser(null);
        setProfessional(null);
      },
    }),
    [user, professional, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}

/** Where each role lands after signing in. */
export function homeFor(role: SessionUser['role'] | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'professional') return '/dashboard';
  if (role === 'client') return '/account';
  return '/';
}
