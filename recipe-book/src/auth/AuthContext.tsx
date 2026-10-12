import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { refreshTokens, setSessionExpiredHandler, tokens } from '../api/client';
import type { RegisterInput, User } from '../api/types';

interface AuthState {
  user: User | null;
  ready: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  endSession: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const endSession = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  // Restore a session on load: use the stored access token, refreshing if needed.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    (async () => {
      try {
        if (!tokens.access && tokens.refresh) await refreshTokens();
        if (tokens.access) setUser(await authApi.me());
      } catch {
        tokens.clear();
      } finally {
        setReady(true);
      }
    })();
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    tokens.set(await authApi.login({ username, password }));
    setUser(await authApi.me());
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      await authApi.register(input);
      await login(input.username, input.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* logout always succeeds server-side; ignore network errors */
    }
    endSession();
  }, [endSession]);

  const reloadUser = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      isAdmin: !!user?.roles?.includes('admin'),
      login,
      register,
      logout,
      reloadUser,
      endSession,
    }),
    [user, ready, login, register, logout, reloadUser, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
