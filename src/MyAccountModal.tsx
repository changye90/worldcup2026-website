import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Trash2, User, X } from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import { useAuth } from './auth';
import type { Translations } from './i18n';
import {
  archiveMyListing,
  listingsForManage,
  loadSavedManageWhatsapp,
  payloadOwnerUserId,
  saveManageWhatsapp,
} from './myListings';
import { isValidWhatsapp, whatsappDigits } from './ticketPostForm';
import { loadVerifiedSellerSession } from './verifiedSeller';
import type { TicketWallPost } from './ticketPosts';

export function MyAccountModal({
  tr,
  wallPosts,
  onClose,
  onDelisted,
}: {
  tr: Translations;
  wallPosts: TicketWallPost[];
  onClose: () => void;
  onDelisted: () => void;
}) {
  const { user } = useAuth();
  const [whatsapp, setWhatsapp] = useState(() => {
    const saved = loadSavedManageWhatsapp();
    if (saved) return saved;
    const seller = loadVerifiedSellerSession();
    return seller?.whatsapp?.trim() || '';
  });
  const [searched, setSearched] = useState(() => Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track(AnalyticsEvent.AccountManageOpen, { is_logged_in: Boolean(user) });
    if (user) setSearched(true);
  }, [user]);

  const listings = useMemo(() => {
    if (!searched) return [];
    return listingsForManage({
      wallPosts,
      userId: user?.id ?? null,
      whatsapp: whatsapp.trim(),
    });
  }, [searched, wallPosts, user?.id, whatsapp]);

  const close = () => onClose();

  const runSearch = () => {
    setError(null);
    if (!user && !isValidWhatsapp(whatsapp)) {
      setError(tr.accountWhatsappRequired);
      return;
    }
    if (user && whatsapp.trim() && !isValidWhatsapp(whatsapp)) {
      setError(tr.accountWhatsappRequired);
      return;
    }
    saveManageWhatsapp(whatsapp);
    setSearched(true);
    const results = listingsForManage({
      wallPosts,
      userId: user?.id ?? null,
      whatsapp: whatsapp.trim(),
    });
    track(AnalyticsEvent.AccountManageSearch, {
      is_logged_in: Boolean(user),
      result_count: results.length,
    });
  };

  const delist = async (post: TicketWallPost) => {
    if (!window.confirm(tr.accountDelistConfirm)) return;
    setBusyId(post.id);
    setError(null);
    const ok = await archiveMyListing(post);
    setBusyId(null);
    if (!ok) {
      setError(tr.accountDelistFailed);
      return;
    }
    track(AnalyticsEvent.AccountListingDelist, {
      post_id: post.id,
      kind: post.kind,
      is_logged_in: Boolean(user),
    });
    onDelisted();
  };

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <button type="button" className="absolute inset-0 bg-pitch-950/85 backdrop-blur-sm" onClick={close} />
      <div className="relative flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-700/60 bg-pitch-800 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-700/50 px-5 py-4">
          <div className="min-w-0">
            <h2 id="account-modal-title" className="flex items-center gap-2 text-lg font-bold text-white">
              <User className="h-5 w-5 shrink-0 text-grass-400" />
              {tr.accountTitle}
            </h2>
            {user ? (
              <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-gray-500">
            {user ? tr.accountIntroLoggedIn : tr.accountIntroGuest}
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-gray-300">{tr.accountWhatsappLabel}</label>
            <p className="mb-2 text-[11px] text-gray-500">{tr.accountWhatsappHint}</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder={tr.formPlaceholderWhatsapp}
                className="min-w-0 flex-1 rounded-xl border border-gray-600/80 bg-[rgb(6,12,22)] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-grass-500/50 focus:outline-none focus:ring-1 focus:ring-grass-500/30"
                autoComplete="tel"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={runSearch}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-grass-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-grass-500"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{tr.accountFindListings}</span>
              </button>
            </div>
          </div>

          {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

          {!searched ? (
            <p className="mt-8 text-center text-sm text-gray-500">{tr.accountEnterWhatsapp}</p>
          ) : listings.length === 0 ? (
            <p className="mt-8 text-center text-sm text-gray-500">{tr.accountNoListingsForWa}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {listings.map(post => (
                <li
                  key={post.id}
                  className="rounded-xl border border-gray-700/50 bg-pitch-900/60 px-3.5 py-3"
                >
                  <p className="line-clamp-2 text-sm font-medium text-white">{post.summary}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {post.kind === 'sell' ? tr.tabTicketSell : tr.tabTicketBuy}
                    {payloadOwnerUserId(post) ? '' : ` · ${tr.accountGuestPost}`}
                  </p>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void delist(post)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {busyId === post.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    {tr.accountDelist}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
