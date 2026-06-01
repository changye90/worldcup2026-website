import { useEffect, useState } from 'react';
import { Loader2, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import { useAuth, type AuthModalMode } from './auth';
import type { Translations } from './i18n';

const fieldCls =
  'w-full rounded-xl border border-gray-600/80 bg-[rgb(6,12,22)] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-grass-500/50 focus:outline-none focus:ring-1 focus:ring-grass-500/30';

export function AuthModal({ tr }: { tr: Translations }) {
  const {
    authModalOpen,
    authModalMode,
    authModalReason,
    closeAuthModal,
    signIn,
    signUp,
    user,
    resendVerificationEmail,
    authConfigured,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authModalOpen) {
      setMode(authModalMode);
      setError(null);
      setInfo(null);
    }
  }, [authModalOpen, authModalMode]);

  useEffect(() => {
    if (authModalOpen && user?.emailVerified) {
      closeAuthModal();
    }
  }, [authModalOpen, user?.emailVerified, closeAuthModal]);

  if (!authModalOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!authConfigured) {
      setError(tr.authNotConfigured);
      return;
    }
    if (!email.trim()) {
      setError(tr.authEmailRequired);
      return;
    }
    if (password.length < 8) {
      setError(tr.authPasswordMin);
      return;
    }
    if (mode === 'sign_up' && password !== confirm) {
      setError(tr.authPasswordMismatch);
      return;
    }

    setBusy(true);
    if (mode === 'sign_in') {
      const err = await signIn(email, password);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      track(AnalyticsEvent.AuthSignIn, { reason: authModalReason ?? 'header' });
      if (user && !user.emailVerified) {
        setInfo(tr.authVerifyEmailHint);
      } else {
        closeAuthModal();
      }
      return;
    }

    const err = await signUp(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    track(AnalyticsEvent.AuthSignUp, { reason: authModalReason ?? 'header' });
    setInfo(tr.authSignUpCheckEmail);
    setMode('sign_in');
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const err = await resendVerificationEmail();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    track(AnalyticsEvent.AuthVerifyResend);
    setInfo(tr.authVerifyEmailSent);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-pitch-950/85 backdrop-blur-sm"
        aria-label={tr.authClose}
        onClick={closeAuthModal}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-700/60 bg-pitch-800 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-3 border-b border-gray-700/50 px-5 py-4">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-white">
              {mode === 'sign_up' ? tr.authSignUpTitle : tr.authSignInTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {authModalReason === 'verified_listing'
                ? tr.authVerifiedListingHint
                : tr.authGuestPostingHint}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user && !user.emailVerified ? (
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-amber-200/90">{tr.authVerifyEmailHint}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onResend()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-grass-600/50 py-2.5 text-sm font-semibold text-grass-300 hover:bg-grass-950/40 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {tr.authResendVerification}
            </button>
            {info ? <p className="text-xs text-grass-400">{info}</p> : null}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </div>
        ) : (
          <form onSubmit={e => void submit(e)} className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-300">{tr.authEmail}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className={fieldCls}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-300">{tr.authPassword}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                className={fieldCls}
                minLength={8}
                required
              />
            </div>
            {mode === 'sign_up' ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  {tr.authConfirmPassword}
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={fieldCls}
                  minLength={8}
                  required
                />
              </div>
            ) : null}

            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            {info ? <p className="text-xs text-grass-400">{info}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-grass-600 py-3 text-sm font-bold text-white hover:bg-grass-500 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'sign_up' ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {mode === 'sign_up' ? tr.authSignUpSubmit : tr.authSignInSubmit}
            </button>

            <p className="text-center text-xs text-gray-500">
              {mode === 'sign_in' ? tr.authNoAccount : tr.authHaveAccount}{' '}
              <button
                type="button"
                className="font-semibold text-grass-400 hover:text-grass-300"
                onClick={() => {
                  setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
                  setError(null);
                  setInfo(null);
                }}
              >
                {mode === 'sign_in' ? tr.authSwitchSignUp : tr.authSwitchSignIn}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
