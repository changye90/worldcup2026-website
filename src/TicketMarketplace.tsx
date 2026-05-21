import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Tag, Clock, MessageCircle, ChevronDown, Share2, Check, ShieldAlert } from 'lucide-react';
import type { Lang, Translations } from './i18n';
import {
  seedTicketWallPosts,
  loadUserTicketPosts,
  loadSharedTicketPosts,
  fetchTicketPostById,
  persistSharedTicketPost,
  persistUserTicketPost,
  type TicketWallPost,
} from './ticketPosts';
import type { TicketSellPayload } from './ticketPostForm';
import { formatCategorySeatLine, getWhatsappHref } from './ticketPostForm';
import {
  formatMatchKickoffDisplay,
  hostCountryForCity,
  primaryScheduleMatchForSellPost,
  resolvedSellMatches,
  sellPostPassesCityFilter,
  sellPriceLine,
  sellUserDescription,
  whatsappPrefillContext,
} from './sellPostResolve';
import {
  clearTicketShareFromUrl,
  getTicketIdFromUrl,
  scrollToTicketPost,
  shareTicketPost,
  ticketPostElementId,
} from './ticketShare';

function TicketShareButton({ post, tr }: { post: TicketWallPost; tr: Translations }) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const onShare = async () => {
    const result = await shareTicketPost(post, tr);
    if (result === 'copied') {
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      type="button"
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
}: {
  text: string;
  tr: Translations;
  className?: string;
}) {
  const toggleCls = 'text-gold-400/90 hover:text-gold-300';
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
        className={`text-sm leading-relaxed text-gray-300 whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}
      >
        {trimmed}
      </p>
      {canExpand || expanded ? (
        <button
          type="button"
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
}: {
  post: TicketWallPost;
  tr: Translations;
  lang: Lang;
  highlighted?: boolean;
}) {
  const p = post.payload as TicketSellPayload | undefined;
  const schedule = primaryScheduleMatchForSellPost(post);
  const allRes = resolvedSellMatches(post);
  const extra = allRes.length > 1 ? allRes.length - 1 : 0;
  const country = schedule ? hostCountryForCity(schedule.city) : undefined;
  const price = sellPriceLine(post, tr);
  const desc = sellUserDescription(post);
  const waHref = getWhatsappHref(post, tr.ticketWhatsappPrefill(whatsappPrefillContext(post)));
  const qty = p?.quantity != null && p.quantity >= 1 ? p.quantity : null;
  const categorySeat = p ? formatCategorySeatLine(p) : null;
  const metaLine = schedule
    ? [country, schedule.city, schedule.stadium].filter(Boolean).join(' · ')
    : null;

  return (
    <article
      id={ticketPostElementId(post.id)}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-pitch-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-900/10 ${
        post.isUser ? 'ring-1 ring-gold-500/30' : ''
      } ${highlighted ? 'ring-2 ring-grass-400 ring-offset-2 ring-offset-pitch-900' : ''}`}
    >
      <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="mb-2.5 flex shrink-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-300/90">
              <Tag className="h-3 w-3 shrink-0" />
              {tr.tabTicketSell}
            </span>
            {post.isUser ? (
              <span className="rounded bg-grass-500/15 px-1.5 py-px text-[10px] font-medium text-grass-300/90">
                {tr.ticketWallYourPost}
              </span>
            ) : null}
            <TicketShareButton post={post} tr={tr} />
          </div>
          <div className="min-h-[2.75rem] shrink-0 text-right">
            <p className="text-lg font-bold leading-tight tabular-nums text-gold-300">{price || '—'}</p>
            <p className="mt-0.5 min-h-[1rem] text-[10px] text-gray-500">
              {qty != null ? (
                <>
                  {tr.ticketQty(qty)}
                  {categorySeat ? ` · ${categorySeat}` : ''}
                </>
              ) : (
                '\u00a0'
              )}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
        {schedule ? (
          <>
            <p className="text-sm font-semibold leading-snug text-gray-100">
              <span className="mr-1" aria-hidden>
                {schedule.flag1}
              </span>
              {schedule.homeTeam}{' '}
              <span className="font-normal text-gray-500">{tr.ticketSellVs}</span> {schedule.awayTeam}
              <span className="ml-1" aria-hidden>
                {schedule.flag2}
              </span>
            </p>
            {metaLine ? <p className="mt-1 text-[11px] leading-snug text-gray-500">{metaLine}</p> : null}
            <p className="mt-0.5 text-[11px] text-gray-500">{formatMatchKickoffDisplay(schedule, lang)}</p>
            {extra > 0 ? (
              <p className="mt-1 text-[10px] text-gray-600">{tr.ticketSellExtraMatches(extra)}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm leading-snug text-gray-300">{post.summary}</p>
        )}

        <div className="mt-2.5 min-h-[4.5rem] flex-1">
          <TicketPostDetails text={desc} tr={tr} className="mt-0" />
        </div>
        </div>

        <div className="mt-auto shrink-0 space-y-2 border-t border-gray-700/40 pt-3">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {tr.contactWhatsApp}
            </a>
          ) : null}
          <p className="flex items-center gap-1 text-[10px] text-gray-600">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{timeAgo(post.createdAt, tr)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function useTicketWall(
  _lang: Lang,
  options?: { onOpenSharePost?: (post: TicketWallPost) => void },
) {
  const [userPosts, setUserPosts] = useState<TicketWallPost[]>(() => loadUserTicketPosts());
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [pendingShareId, setPendingShareId] = useState<string | null>(() => getTicketIdFromUrl());
  const shareResolvedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const localPosts = loadUserTicketPosts();
    const localIds = new Set(localPosts.map(p => p.id));
    void loadSharedTicketPosts(localIds).then(shared => {
      if (!active || !shared) return;
      setUserPosts(() => {
        const merged = new Map<string, TicketWallPost>();
        [...localPosts, ...shared].forEach(p => {
          merged.set(p.id, localIds.has(p.id) ? { ...p, isUser: true } : p);
        });
        return Array.from(merged.values())
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 200);
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const mergePost = useCallback((post: TicketWallPost) => {
    setUserPosts(prev => {
      const merged = new Map<string, TicketWallPost>();
      merged.set(post.id, post);
      prev.forEach(p => merged.set(p.id, p));
      return Array.from(merged.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 200);
    });
  }, []);

  const openSharedPost = useCallback(
    (post: TicketWallPost) => {
      setHighlightPostId(post.id);
      options?.onOpenSharePost?.(post);
      window.setTimeout(() => scrollToTicketPost(post.id), 280);
      window.setTimeout(() => setHighlightPostId(null), 4500);
    },
    [options],
  );

  useEffect(() => {
    if (!pendingShareId || shareResolvedRef.current) return;

    const local = [...userPosts, ...seedTicketWallPosts].find(
      p => p.id === pendingShareId && p.kind === 'sell',
    );
    if (local) {
      shareResolvedRef.current = true;
      setPendingShareId(null);
      clearTicketShareFromUrl();
      openSharedPost(local);
      return;
    }

    let active = true;
    void fetchTicketPostById(pendingShareId).then(fetched => {
      if (!active || shareResolvedRef.current) return;
      shareResolvedRef.current = true;
      setPendingShareId(null);
      clearTicketShareFromUrl();
      if (fetched?.kind === 'sell') {
        mergePost(fetched);
        openSharedPost(fetched);
      }
    });
    return () => {
      active = false;
    };
  }, [pendingShareId, userPosts, mergePost, openSharedPost]);

  const handlePost = useCallback((post: TicketWallPost) => {
    persistUserTicketPost(post);
    setUserPosts(prev => {
      const merged = new Map<string, TicketWallPost>([[post.id, { ...post, isUser: true }]]);
      prev.forEach(p => merged.set(p.id, p));
      return Array.from(merged.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 200);
    });
    void persistSharedTicketPost(post);
    return post;
  }, []);

  const sellPosts = useMemo(() => {
    return [...userPosts, ...seedTicketWallPosts]
      .filter(p => p.kind === 'sell')
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [userPosts]);

  return { userPosts, handlePost, sellPosts, highlightPostId };
}

export { TicketPostFormModal as TicketPostModal } from './TicketPostFormModal';

export function TicketPostGrid({
  posts,
  tr,
  lang,
  activeCity = null,
  highlightPostId = null,
}: {
  posts: TicketWallPost[];
  tr: Translations;
  lang: Lang;
  activeCity?: string | null;
  highlightPostId?: string | null;
}) {
  const visible = useMemo(() => {
    if (!activeCity) return posts;
    return posts.filter(p => sellPostPassesCityFilter(p, activeCity));
  }, [posts, activeCity]);

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
        />
      ))}
    </div>
  );
}
