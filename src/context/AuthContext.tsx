import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminUser } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  AuthSession,
  getStoredSession,
  authenticate,
  fetchStaffProfile,
  clearStoredSession,
  checkRolePermission,
} from '../services/authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired';

interface AuthContextValue {
  authStatus: AuthStatus;
  user: AdminUser | null;
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  clearExpiredState: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);

  // Initial session check on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active = await getStoredSession();
      if (cancelled) return;
      if (active) {
        setSession(active);
        setAuthStatus('authenticated');
      } else {
        setSession(null);
        setAuthStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to real Supabase Auth session events (token refresh, expiry,
  // sign-out from another tab, etc.) instead of polling on a timer.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthStatus('unauthenticated');
        return;
      }
      if (!newSession?.user) return;

      const profile = await fetchStaffProfile(newSession.user.id);
      if (!profile) {
        // Signed-in Supabase user with no matching staff profile - not an
        // authorized studio account, treat as logged out.
        await supabase.auth.signOut();
        setSession(null);
        setAuthStatus('unauthenticated');
        return;
      }
      setSession({ user: profile });
      setAuthStatus('authenticated');
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authenticate(email, password);
    if (result.success && result.session) {
      setSession(result.session);
      setAuthStatus('authenticated');
      return { success: true };
    }
    return { success: false, error: result.error || 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setAuthStatus('unauthenticated');
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!session?.user) return false;
      return checkRolePermission(session.user.role, permission);
    },
    [session]
  );

  const clearExpiredState = useCallback(() => {
    if (authStatus === 'expired') {
      setAuthStatus('unauthenticated');
    }
  }, [authStatus]);

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        user: session?.user || null,
        session,
        login,
        logout,
        hasPermission,
        clearExpiredState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
