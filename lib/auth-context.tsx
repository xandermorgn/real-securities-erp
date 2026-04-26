'use client';

import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import { apiUrl } from './api';

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'field_officer' | 'staff';
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const EXPIRY_CHECK_INTERVAL_MS = 60_000;
const EXPIRY_BUFFER_MS = 30_000;

function isTokenExpired(tkn: string): boolean {
  try {
    const parts = tkn.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000 + EXPIRY_BUFFER_MS;
  } catch {
    return true;
  }
}

function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      'API server is not responding correctly. Please ensure the API is running on port 4001.'
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAuth = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const verifyToken = useCallback(async (tkn: string) => {
    if (isTokenExpired(tkn)) {
      clearAuth();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/auth/verify'), {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) {
        throw new Error('Invalid token');
      }
      const data = (await safeJson(res)) as { user?: User } | null;
      if (!data || !data.user) {
        throw new Error('Malformed verify response');
      }
      setUser(data.user);
      setToken(tkn);
    } catch (e) {
      console.warn('[AuthProvider] Token verification failed:', e);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken || isTokenExpired(storedToken)) {
      clearStoredToken();
      setLoading(false);
      return;
    }
    void verifyToken(storedToken);
  }, [verifyToken]);

  // Periodically check token expiry so long-running sessions auto-logout
  useEffect(() => {
    expiryTimerRef.current = setInterval(() => {
      if (!token) return;
      if (isTokenExpired(token)) {
        clearAuth();
      }
    }, EXPIRY_CHECK_INTERVAL_MS);

    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, [token, clearAuth]);

  const login = useCallback(async (identifier: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      throw new Error(
        'Cannot reach API server. Please ensure the API is running on port 4001.'
      );
    }

    const data = (await safeJson(res)) as
      | { token?: string; user?: User; error?: string }
      | null;

    if (!res.ok) {
      throw new Error(data?.error || 'Invalid credentials');
    }
    if (!data || !data.token || !data.user) {
      throw new Error('Invalid response from server');
    }

    if (isTokenExpired(data.token)) {
      throw new Error('Received an already-expired token from server');
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
