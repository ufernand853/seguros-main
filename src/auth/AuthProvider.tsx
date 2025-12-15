import { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = { name: string; email?: string };
type AuthState = {
  user: User | null;
  token: string | null;
  expiresAt: number | null;
};

type AuthContextType = {
  isAuthed: boolean;
  user: User | null;
  token: string | null;
  login: (u: User, token?: string, ttlMinutes?: number) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "auth_state_v1";

function readStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, expiresAt: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, token: null, expiresAt: null };
  }
}

function writeStorage(s: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readStorage());

  // Expiración automática (chequeo cada 30s)
  useEffect(() => {
    const id = setInterval(() => {
      if (state.expiresAt && Date.now() > state.expiresAt) {
        setState({ user: null, token: null, expiresAt: null });
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [state.expiresAt]);

  // Persistencia
  useEffect(() => {
    writeStorage(state);
  }, [state]);

  const api = useMemo<AuthContextType>(() => ({
    isAuthed: !!state.user && !!state.token && (!state.expiresAt || Date.now() < state.expiresAt),
    user: state.user,
    token: state.token,
    login: (u, token = "mock-token", ttlMinutes = 120) => {
      const expiresAt = Date.now() + ttlMinutes * 60_000;
      setState({ user: u, token, expiresAt });
    },
    logout: () => {
      setState({ user: null, token: null, expiresAt: null });
      localStorage.removeItem(STORAGE_KEY);
    },
  }), [state]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
