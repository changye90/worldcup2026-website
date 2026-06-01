import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user?.id) return null;
  const email = user.email?.trim() || '';
  if (!email) return null;
  return {
    id: user.id,
    email,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export type AuthModalMode = 'sign_in' | 'sign_up';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  authConfigured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<string | null>;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  authModalReason: 'verified_listing' | 'header' | null;
  openAuthModal: (mode?: AuthModalMode, reason?: 'verified_listing' | 'header') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authRedirectUrl(): string {
  const origin =
    import.meta.env.VITE_SITE_ORIGIN?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://okcopa.com');
  return `${origin.replace(/\/$/, '')}/tickets`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const authConfigured = Boolean(supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('sign_in');
  const [authModalReason, setAuthModalReason] = useState<'verified_listing' | 'header' | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const user = useMemo(() => toAuthUser(session?.user ?? null), [session]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return 'Auth is not configured.';
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error?.message ?? null;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return 'Auth is not configured.';
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      return error?.message ?? null;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }, [supabase]);

  const resendVerificationEmail = useCallback(async (): Promise<string | null> => {
    if (!supabase || !user?.email) return 'Auth is not configured.';
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    return error?.message ?? null;
  }, [supabase, user?.email]);

  const openAuthModal = useCallback(
    (mode: AuthModalMode = 'sign_in', reason: 'verified_listing' | 'header' = 'header') => {
      setAuthModalMode(mode);
      setAuthModalReason(reason);
      setAuthModalOpen(true);
    },
    [],
  );

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalReason(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authConfigured,
      signIn,
      signUp,
      signOut,
      resendVerificationEmail,
      authModalOpen,
      authModalMode,
      authModalReason,
      openAuthModal,
      closeAuthModal,
    }),
    [
      user,
      loading,
      authConfigured,
      signIn,
      signUp,
      signOut,
      resendVerificationEmail,
      authModalOpen,
      authModalMode,
      authModalReason,
      openAuthModal,
      closeAuthModal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Session access for non-React modules (verified seller registration). */
export async function getAuthSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
