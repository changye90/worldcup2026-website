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
import { AUTH_RETURN_SELL_GUARANTEE, saveAuthReturnIntent } from './authReturn';
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
  const url = new URL(`${origin.replace(/\/$/, '')}/tickets`);
  url.searchParams.set('auth_return', AUTH_RETURN_SELL_GUARANTEE);
  return url.toString();
}

/** Remove #access_token=… from the address bar after email confirmation. */
async function scrubAuthHashFromUrl(supabase: NonNullable<ReturnType<typeof getSupabase>>): Promise<void> {
  const hash = window.location.hash;
  if (!hash.includes('access_token=') && !hash.includes('error=') && !hash.includes('type=signup')) {
    return;
  }
  await supabase.auth.getSession();
  const url = new URL(window.location.href);
  url.hash = '';
  const next = `${url.pathname}${url.search}`;
  window.history.replaceState(window.history.state, '', next);
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

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, next) => {
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void scrubAuthHashFromUrl(supabase);
      }
    });

    if (window.location.hash.includes('access_token=')) {
      void scrubAuthHashFromUrl(supabase);
    }

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
      if (reason === 'verified_listing') {
        saveAuthReturnIntent({ openSellModal: true, platformGuarantee: true });
      }
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
