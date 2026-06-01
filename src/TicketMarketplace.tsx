import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  Tag,
  Clock,
  MessageCircle,
  ChevronDown,
  Share2,
  Check,
  ShieldAlert,
  MapPin,
  Ticket,
  Calendar,
} from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import type { Lang, Translations } from './i18n';
import {
  seedTicketWallPosts,
  loadUserTicketPosts,
  loadCachedSharedTicketPosts,
  persistCachedSharedTicketPosts,
  mergeTicketWallPosts,
  prefetchSharedTicketPosts,
  isTicketWallRemoteEnabled,
  TICKET_WALL_MAX_POSTS,
  fetchTicketPostById,
  persistSharedTicketPost,
  persistUserTicketPost,
  type TicketWallPost,
  sortTicketPostsNewestFirst,
} from './ticketPosts';
import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import { formatBudgetDisplay, formatCategorySeatLine, getWhatsappHref } from './ticketPostForm';
import {
  formatMatchKickoffDisplay,
  primaryScheduleMatchForSellPost,
  resolvedSellMatches,
  filterBuyPosts,
  filterSellPosts,
  sellFixedPriceDisplay,
  sellHasFixedPrice,
  sellNotesExcludingStructured,
  whatsappPrefillContext,
} from './sellPostResolve';
import { parseTicketPostIdFromPath } from './ticketRouting';
import { filterVisibleBuyPosts, filterVisibleTicketWallPosts } from './ticketWallFilters';
import { postHasPlatformGuarantee } from './platformGuarantee';
import { VerifiedSellerBadge } from './VerifiedSellerBadge';
import { getTicketIdFromUrl, shareTicketPost, ticketPostElementId } from './ticketShare';

/** Clicks on these elements must not open the ticket detail page. */
const CARD_NAV_EXCLUDE = '[data-card-nav-exclude]';

function isCardNavExcluded(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(CARD_NAV_EXCLUDE));
}

function TicketShareButton({ post, tr }: { post: TicketWallPost; tr: Translations }) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const onShare = async () => {
    track(AnalyticsEvent.TicketShare, {
      post_id: post.id,
      kind: post.kind,
      is_user: Boolean(post.isUser),
    });
    const result = await shareTicketPost(post, tr);
    if (result === 'copied') {
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      type="button"
      data-card-nav-exclude
      onClick={() => void onShare()}
      className="inline-flex items-center gap-1 rounded-lg border border-gray-600/70 bg-pitch-900/60 px-2 py-1 text-[10px] font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
      aria-label={tr.ticketShareAria}
    >
      {status === 'copied' ? (
        <>
          <Check className="h-3 w-3 text-grass-400" />
          <span className="text-grass-300">{tr.ticketShareCopied}</span>
        </>
      ) : (
        <>
          <Share2 className="h-3 w-3" />
          <span>{tr.ticketShare}</span>
        </>
      )}
    </button>
  );
}

/** Details: clamp to 4 lines; tap to expand/collapse when longer. */
function TicketPostDetails({
  text,
  tr,
  className = 'mt-2.5',
  muted = false,
}: {
  text: string;
  tr: Translations;
  className?: string;
  muted?: boolean;
}) {
  const toggleCls = muted ? 'text-gray-500 hover:text-gray-400' : 'text-gold-400/90 hover:text-gold-300';
  const bodyCls = muted
    ? 'text-sm leading-relaxed text-slate-400 whitespace-pre-line'
    : 'text-sm leading-relaxed text-gray-300 whitespace-pre-line';
  const trimmed = text.trim();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 2);
  }, [trimmed, expanded]);

  if (!trimmed) return null;

  return (
    <div className={className}>
      <p
        ref={bodyRef}
        className={`${bodyCls} ${expanded ? '' : 'line-clamp-3'}`}
      >
        {trimmed}
      </p>
      {canExpand || expanded ? (
        <button
          type="button"
          data-card-nav-exclude
          onClick={() => setExpanded(v => !v)}
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${toggleCls}`}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? tr.ticketDetailsCollapse : tr.ticketDetailsExpand}
        </button>
      ) : null}
    </div>
  );
}

/** Site-wide ticket marketplace safety notice (footer). */
export function TicketSafetyDisclaimer({ tr }: { tr: Translations }) {
  return (
    <div
      role="note"
      className="mx-auto mb-6 max-w-2xl border-t border-gray-700/50 pt-5 text-left"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-gold-500/80" aria-hidden />
        {tr.ticketBuyDisclaimerTitle}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{tr.ticketBuyDisclaimerIntro}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-gray-600">
        {tr.ticketBuyDisclaimerBullets.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function InfoGridRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pitch-900/80 text-base">
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <div className="mt-0.5 text-sm font-medium leading-snug text-gray-100">{children}</div>
      </div>
    </li>
  );
}

function buildSeatsLine(p: TicketSellPayload, tr: Translations): string | null {
  const seat = formatCategorySeatLine(p);
  const qty = p.quantity >= 1 ? p.quantity : null;
  if (seat && qty != null) return `${seat} ${tr.ticketCardTicketCount(qty)}`;
  if (seat) return seat;
  if (qty != null) return tr.ticketCardTicketCount(qty).replace(/^\(|\)$/g, '');
  return null;
}

function timeAgo(ts: number, tr: Translations): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return tr.ticketWallJustNow;
  if (mins < 60) return tr.ticketWallMinutesAgo(mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr.ticketWallHoursAgo(hrs);
  return tr.ticketWallDaysAgo(Math.floor(hrs / 24));
}

function TicketSellPostCard({
  post,
  tr,
  lang,
  highlighted,
  onViewDetails,
}: {
  post: TicketWallPost;
  tr: Translations;
  lang: Lang;
  highlighted?: boolean;
  onViewDetails?: (postId: string) => void;
}) {
  const p = post.payload as TicketSellPayload | undefined;
  const schedule = primaryScheduleMatchForSellPost(post);
  const allRes = resolvedSellMatches(post);
  const extra = allRes.length > 1 ? allRes.length - 1 : 0;
  const hasFixed = sellHasFixedPrice(post);
  const fixedPrice = sellFixedPriceDisplay(post);
  const sellerNotes = sellNotesExcludingStructured(post, schedule);
  const waHref = getWhatsappHref(post, tr.ticketWhatsappPrefill(whatsappPrefillContext(post)));
  const seatsLine = p ? buildSeatsLine(p, tr) : null;
  const stadiumLine = schedule
    ? [schedule.stadium, schedule.city].filter(Boolean).join(', ')
    : null;
  const verified = postHasPlatformGuarantee(post);

  const openDetails = onViewDetails
    ? (e: React.MouseEvent | React.KeyboardEvent) => {
        if (isCardNavExcluded(e.target)) return;
        onViewDetails(post.id);
      }
    : undefined;

  return (
    <article
      id={ticketPostElementId(post.id)}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={e => {
        if (!onViewDetails) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (isCardNavExcluded(e.target)) return;
        e.preventDefault();
        onViewDetails(post.id);
      }}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-700/40 bg-pitch-800/95 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/35 hover:shadow-xl hover:shadow-black/20 ${
        onViewDetails ? 'cursor-pointer' : ''
      } ${post.isUser ? 'ring-1 ring-gold-500/25' : ''} ${
        highlighted ? 'ring-2 ring-grass-400 ring-offset-2 ring-offset-pitch-900' : ''
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        {/* Zone 1 — status, price anchor, buyer-fee badge */}
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-grass-600/40 bg-grass-900/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-grass-300">
                <Tag className="h-3 w-3 shrink-0" aria-hidden />
                {tr.ticketSellStatusBadge}
              </span>
              {verified ? <VerifiedSellerBadge tr={tr} /> : null}
              {post.isUser ? (
                <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold text-gold-200/90">
                  {tr.ticketWallYourPost}
                </span>
              ) : null}
              <TicketShareButton post={post} tr={tr} />
            </div>

            <div className="shrink-0 text-right">
              {hasFixed && fixedPrice ? (
                <p className="text-2xl font-extrabold leading-none tabular-nums tracking-tight text-gold-300 sm:text-[1.65rem]">
                  {fixedPrice}
                </p>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-lg font-extrabold leading-tight text-orange-300 sm:text-xl">
                    {tr.ticketPriceNegotiableTitle}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400">{tr.ticketPriceNegotiableHint}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Zone 2 — structured info grid */}
        <ul className="mt-5 flex-1 space-y-4 py-1">
          <InfoGridRow icon="🏟️" label={tr.ticketCardLabelMatch}>
            {schedule ? (
              <>
                <span className="mr-1" aria-hidden>
                  {schedule.flag1}
                </span>
                {schedule.homeTeam}{' '}
                <span className="font-normal text-gray-500">{tr.ticketSellVs}</span> {schedule.awayTeam}
                <span className="ml-1" aria-hidden>
                  {schedule.flag2}
                </span>
                {extra > 0 ? (
                  <p className="mt-1 text-[11px] font-normal text-gray-500">
                    {tr.ticketSellExtraMatches(extra)}
                  </p>
                ) : null}
              </>
            ) : (
              <span className="text-gray-300">{post.summary}</span>
            )}
          </InfoGridRow>

          {stadiumLine ? (
            <InfoGridRow icon={<MapPin className="h-4 w-4 text-sky-400" />} label={tr.ticketCardLabelStadium}>
              {stadiumLine}
            </InfoGridRow>
          ) : null}

          {schedule ? (
            <InfoGridRow icon={<Calendar className="h-4 w-4 text-gold-400/90" />} label={tr.ticketCardLabelKickoff}>
              {formatMatchKickoffDisplay(schedule, lang)}
            </InfoGridRow>
          ) : null}

          {seatsLine ? (
            <InfoGridRow icon={<Ticket className="h-4 w-4 text-gold-300" />} label={tr.ticketCardLabelSeats}>
              {seatsLine}
            </InfoGridRow>
          ) : null}
        </ul>

        {/* Zone 3 — seller notes (deduped, muted) */}
        {sellerNotes ? (
          <div className="mb-4 shrink-0 rounded-xl bg-pitch-900/60 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {tr.ticketSellerNotesHeading}
            </p>
            <TicketPostDetails
              text={sellerNotes}
              tr={tr}
              className="mt-2"
              muted
            />
          </div>
        ) : null}

        {/* Zone 4 — CTA + trust */}
        <footer className="mt-auto shrink-0 space-y-2.5 pt-2">
          {waHref ? (
            <a
              href={waHref}
              data-card-nav-exclude
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => {
                e.stopPropagation();
                track(AnalyticsEvent.TicketWhatsapp, {
                  post_id: post.id,
                  kind: post.kind,
                  is_user: Boolean(post.isUser),
                  has_wa: true,
                });
              }}
              className="animate-wa-pulse flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              {tr.contactWhatsApp}
            </a>
          ) : null}
          <p className="px-1 text-center text-xs leading-relaxed text-gray-500">
            <span aria-hidden className="mr-0.5">
              {verified ? '✓' : '🔒'}
            </span>
            {verified ? tr.verifiedPlatformGuaranteeBody : tr.ticketTrustGuarantee}
          </p>
          <p className="flex items-center gap-1 text-[10px] text-gray-600">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{timeAgo(post.createdAt, tr)}</span>
          </p>
        </footer>
      </div>
    </article>
  );
}

function TicketBuyPostCard({
  post,
  tr,
  highlighted,
  onViewDetails,
}: {
  post: TicketWallPost;
  tr: Translations;
  highlighted?: boolean;
  onViewDetails?: (postId: string) => void;
}) {
  const p = post.payload as TicketBuyPayload | undefined;
  const target = p?.targetMatch?.trim() || post.summary;
  const waHref = getWhatsappHref(post, tr.ticketWhatsappPrefill(whatsappPrefillContext(post)));

  const openDetails = onViewDetails
    ? (e: React.MouseEvent | React.KeyboardEvent) => {
        if (isCardNavExcluded(e.target)) return;
        onViewDetails(post.id);
      }
    : undefined;

  return (
    <article
      id={ticketPostElementId(post.id)}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={e => {
        if (!onViewDetails) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (isCardNavExcluded(e.target)) return;
        e.preventDefault();
        onViewDetails(post.id);
      }}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-700/40 bg-pitch-800/95 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/35 hover:shadow-xl hover:shadow-black/20 ${
        onViewDetails ? 'cursor-pointer' : ''
      } ${post.isUser ? 'ring-1 ring-sky-500/25' : ''} ${
        highlighted ? 'ring-2 ring-grass-400 ring-offset-2 ring-offset-pitch-900' : ''
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-900/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200">
                <Tag className="h-3 w-3 shrink-0" aria-hidden />
                {tr.tabTicketBuy}
              </span>
              {post.isUser ? (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200/90">
                  {tr.ticketWallYourPost}
                </span>
              ) : null}
              <TicketShareButton post={post} tr={tr} />
            </div>
            {p?.budget?.trim() ? (
              <p className="shrink-0 text-right text-lg font-extrabold tabular-nums text-sky-300">
                {formatBudgetDisplay(p.budget, tr)}
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-base font-bold leading-snug text-white sm:text-lg">{target}</p>
        </header>

        <ul className="mt-5 flex-1 space-y-4 py-1">
          {p ? (
            <>
              <InfoGridRow icon="🎫" label={tr.formLabelQuantity}>
                {p.quantity}
              </InfoGridRow>
              {p.category ? (
                <InfoGridRow icon="📋" label={tr.formLabelCategory}>
                  {p.category}
                </InfoGridRow>
              ) : null}
              {p.seatDetails?.trim() ? (
                <InfoGridRow icon={<Ticket className="h-4 w-4 text-sky-300" />} label={tr.formLabelSeatDetails}>
                  {p.seatDetails.trim()}
                </InfoGridRow>
              ) : null}
              {p.budget?.trim() ? (
                <InfoGridRow icon="💰" label={tr.formLabelBudget}>
                  {formatBudgetDisplay(p.budget, tr)}
                </InfoGridRow>
              ) : null}
            </>
          ) : null}
        </ul>

        <footer className="mt-auto shrink-0 space-y-2.5 pt-2">
          {waHref ? (
            <a
              href={waHref}
              data-card-nav-exclude
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => {
                e.stopPropagation();
                track(AnalyticsEvent.TicketWhatsapp, {
                  post_id: post.id,
                  kind: post.kind,
                  is_user: Boolean(post.isUser),
                  has_wa: true,
                });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              {tr.contactWhatsApp}
            </a>
          ) : null}
          <p className="flex items-center gap-1 text-[10px] text-gray-600">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{timeAgo(post.createdAt, tr)}</span>
          </p>
        </footer>
      </div>
    </article>
  );
}

function resolveSharePost(
  id: string,
  userPosts: TicketWallPost[],
): TicketWallPost | undefined {
  return [...userPosts, ...loadUserTicketPosts(), ...seedTicketWallPosts].find(p => p.id === id);
}

function initialWallPosts(): TicketWallPost[] {
  const local = loadUserTicketPosts();
  const cached = loadCachedSharedTicketPosts();
  return mergeTicketWallPosts(local, cached);
}

export function useTicketWall(
  _lang: Lang,
  options?: { onOpenSharePost?: (post: TicketWallPost) => void; useDetailPage?: boolean },
) {
  const remoteWall = isTicketWallRemoteEnabled();
  const [userPosts, setUserPosts] = useState<TicketWallPost[]>(initialWallPosts);
  const [wallLoading, setWallLoading] = useState(
    () => remoteWall && loadCachedSharedTicketPosts().length === 0,
  );
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const onDetailPath = typeof window !== 'undefined' && !!parseTicketPostIdFromPath(window.location.pathname);
  const [pendingShareId, setPendingShareId] = useState<string | null>(() =>
    options?.useDetailPage && onDetailPath ? null : getTicketIdFromUrl(),
  );
  const [shareLinkLoading, setShareLinkLoading] = useState(
    () => !options?.useDetailPage && !!getTicketIdFromUrl() && !onDetailPath,
  );
  const shareResolvedRef = useRef(false);
  const shareFetchStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!remoteWall) return;
    let active = true;
    const localPosts = loadUserTicketPosts();
    void prefetchSharedTicketPosts().then(shared => {
      if (!active) return;
      setWallLoading(false);
      if (!shared) return;
      persistCachedSharedTicketPosts(shared);
      setUserPosts(mergeTicketWallPosts(localPosts, shared));
    });
    return () => {
      active = false;
    };
  }, [remoteWall]);

  const mergePost = useCallback((post: TicketWallPost) => {
    setUserPosts(prev => {
      const merged = new Map<string, TicketWallPost>();
      merged.set(post.id, post);
      prev.forEach(p => merged.set(p.id, p));
      return sortTicketPostsNewestFirst(Array.from(merged.values())).slice(0, TICKET_WALL_MAX_POSTS);
    });
  }, []);

  const openSharedPost = useCallback(
    (post: TicketWallPost) => {
      track(AnalyticsEvent.TicketDeepLink, {
        post_id: post.id,
        kind: post.kind,
      });
      mergePost(post);
      if (options?.useDetailPage) {
        options.onOpenSharePost?.(post);
        return;
      }
      setHighlightPostId(post.id);
      options?.onOpenSharePost?.(post);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(ticketPostElementId(post.id))?.scrollIntoView({
            behavior: 'instant',
            block: 'center',
          });
        });
      });
      window.setTimeout(() => setHighlightPostId(null), 4500);
    },
    [mergePost, options],
  );

  const finishShareResolve = useCallback(
    (post: TicketWallPost) => {
      if (shareResolvedRef.current) return;
      shareResolvedRef.current = true;
      setShareLinkLoading(false);
      setPendingShareId(null);
      openSharedPost(post);
    },
    [openSharedPost],
  );

  /** Prefer cache/wall hit; otherwise one single-row Supabase fetch (not the 200-post list). */
  useEffect(() => {
    const id = pendingShareId;
    if (!id || shareResolvedRef.current) return;

    const cached = resolveSharePost(id, userPosts);
    if (cached) {
      finishShareResolve(cached);
      return;
    }

    if (shareFetchStartedRef.current === id) return;
    shareFetchStartedRef.current = id;

    let active = true;
    void fetchTicketPostById(id).then(fetched => {
      if (!active || shareResolvedRef.current) return;
      if (fetched && (fetched.kind === 'sell' || fetched.kind === 'buy')) {
        finishShareResolve(fetched);
        return;
      }
      setShareLinkLoading(false);
      setPendingShareId(null);
      shareFetchStartedRef.current = null;
    });
    return () => {
      active = false;
    };
  }, [pendingShareId, userPosts, finishShareResolve]);

  const handlePost = useCallback((post: TicketWallPost) => {
    setWallLoading(false);
    persistUserTicketPost(post);
    setUserPosts(prev => {
      const merged = new Map<string, TicketWallPost>([[post.id, { ...post, isUser: true }]]);
      prev.forEach(p => merged.set(p.id, p));
      return sortTicketPostsNewestFirst(Array.from(merged.values())).slice(0, TICKET_WALL_MAX_POSTS);
    });
    void persistSharedTicketPost(post);
    return post;
  }, []);

  const sellPosts = useMemo(() => {
    const byId = new Map<string, TicketWallPost>();
    for (const p of userPosts) {
      if (p.kind === 'sell') byId.set(p.id, p);
    }
    for (const p of seedTicketWallPosts) {
      if (p.kind === 'sell') byId.set(p.id, p);
    }
    const list = filterVisibleTicketWallPosts(sortTicketPostsNewestFirst(Array.from(byId.values())));
    const pinId = highlightPostId ?? pendingShareId;
    if (!pinId) return list;
    const pinned = list.find(p => p.id === pinId);
    if (!pinned) return list;
    return [pinned, ...list.filter(p => p.id !== pinId)];
  }, [userPosts, highlightPostId, pendingShareId]);

  const buyPosts = useMemo(() => {
    const byId = new Map<string, TicketWallPost>();
    for (const p of userPosts) {
      if (p.kind === 'buy') byId.set(p.id, p);
    }
    for (const p of seedTicketWallPosts) {
      if (p.kind === 'buy') byId.set(p.id, p);
    }
    const list = filterVisibleBuyPosts(sortTicketPostsNewestFirst(Array.from(byId.values())));
    const pinId = highlightPostId ?? pendingShareId;
    if (!pinId) return list;
    const pinned = list.find(p => p.id === pinId);
    if (!pinned || pinned.kind !== 'buy') return list;
    return [pinned, ...list.filter(p => p.id !== pinId)];
  }, [userPosts, highlightPostId, pendingShareId]);

  return { userPosts, handlePost, sellPosts, buyPosts, highlightPostId, shareLinkLoading, wallLoading };
}

export { TicketPostFormModal as TicketPostModal } from './TicketPostFormModal';

function TicketWallSkeleton({ tr }: { tr: Translations }) {
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label={tr.ticketWallLoading}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-700/50 bg-pitch-800/60 p-5"
        >
          <div className="h-4 w-1/3 rounded bg-pitch-700/80" />
          <div className="mt-4 h-8 w-4/5 rounded-lg bg-pitch-700/70" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-pitch-700/50" />
            <div className="h-3 w-5/6 rounded bg-pitch-700/50" />
          </div>
          <div className="mt-5 h-10 w-full rounded-xl bg-pitch-700/60" />
        </div>
      ))}
      <p className="col-span-full text-center text-sm text-gray-500">{tr.ticketWallLoading}</p>
    </div>
  );
}

function TicketShareLinkSkeleton({ tr }: { tr: Translations }) {
  return (
    <div
      className="mb-5 animate-pulse rounded-2xl border border-gold-500/30 bg-pitch-800/80 p-5"
      aria-busy="true"
      aria-label={tr.ticketShareLoading}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gold-300/90">{tr.ticketShareHighlight}</p>
      <div className="mt-4 h-8 w-2/5 rounded-lg bg-pitch-700/80" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-pitch-700/60" />
        <div className="h-4 w-4/5 rounded bg-pitch-700/60" />
      </div>
      <p className="mt-4 text-sm text-gray-500">{tr.ticketShareLoading}</p>
    </div>
  );
}

export function TicketPostGrid({
  posts,
  tr,
  lang,
  activeCity = null,
  activeMatchNumber = null,
  activeNation = null,
  highlightPostId = null,
  shareLinkLoading = false,
  wallLoading = false,
  onViewDetails,
}: {
  posts: TicketWallPost[];
  tr: Translations;
  lang: Lang;
  activeCity?: string | null;
  activeMatchNumber?: number | null;
  activeNation?: string | null;
  highlightPostId?: string | null;
  shareLinkLoading?: boolean;
  wallLoading?: boolean;
  onViewDetails?: (postId: string) => void;
}) {
  const visible = useMemo(
    () => filterSellPosts(posts, { activeCity, activeMatchNumber, activeNation }),
    [posts, activeCity, activeMatchNumber, activeNation],
  );

  if (shareLinkLoading) {
    return <TicketShareLinkSkeleton tr={tr} />;
  }

  if (wallLoading) {
    return <TicketWallSkeleton tr={tr} />;
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700/60 bg-pitch-800/40 px-6 py-14 text-center text-sm text-gray-500">
        {tr.ticketWallEmptySell}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(p => (
        <TicketSellPostCard
          key={p.id}
          post={p}
          tr={tr}
          lang={lang}
          highlighted={highlightPostId === p.id}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

export function TicketWantedGrid({
  posts,
  tr,
  activeCity = null,
  activeMatchNumber = null,
  activeNation = null,
  highlightPostId = null,
  shareLinkLoading = false,
  wallLoading = false,
  onViewDetails,
}: {
  posts: TicketWallPost[];
  tr: Translations;
  activeCity?: string | null;
  activeMatchNumber?: number | null;
  activeNation?: string | null;
  highlightPostId?: string | null;
  shareLinkLoading?: boolean;
  wallLoading?: boolean;
  onViewDetails?: (postId: string) => void;
}) {
  const visible = useMemo(
    () => filterBuyPosts(posts, { activeCity, activeMatchNumber, activeNation }),
    [posts, activeCity, activeMatchNumber, activeNation],
  );

  if (shareLinkLoading) {
    return <TicketShareLinkSkeleton tr={tr} />;
  }

  if (wallLoading) {
    return <TicketWallSkeleton tr={tr} />;
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700/60 bg-pitch-800/40 px-6 py-14 text-center text-sm text-gray-500">
        {tr.ticketWallEmptyBuy}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(p => (
        <TicketBuyPostCard
          key={p.id}
          post={p}
          tr={tr}
          highlighted={highlightPostId === p.id}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
