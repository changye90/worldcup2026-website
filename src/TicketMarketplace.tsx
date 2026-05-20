import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Tag, Search, Clock, MessageCircle, ChevronDown } from 'lucide-react';
import type { Lang, Translations } from './i18n';
import {
  seedTicketWallPosts,
  loadUserTicketPosts,
  persistUserTicketPost,
  type TicketWallPost,
  type TicketWallKind,
} from './ticketPosts';
import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import { getPostWhatsapp } from './ticketPostForm';
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

/** Details: clamp to 4 lines; tap to expand/collapse when longer. */
function TicketPostDetails({
  text,
  tr,
  className = 'mt-2.5',
  tone = 'sell',
}: {
  text: string;
  tr: Translations;
  className?: string;
  tone?: 'sell' | 'buy';
}) {
  const toggleCls =
    tone === 'buy'
      ? 'text-sky-400/90 hover:text-sky-300'
      : 'text-gold-400/90 hover:text-gold-300';
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

function timeAgo(ts: number, tr: Translations): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return tr.ticketWallJustNow;
  if (mins < 60) return tr.ticketWallMinutesAgo(mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr.ticketWallHoursAgo(hrs);
  return tr.ticketWallDaysAgo(Math.floor(hrs / 24));
}

export function formatTicketWallLine(post: TicketWallPost, tr: Translations): string {
  const verb = post.kind === 'buy' ? tr.ticketWallSeekingVerb : tr.ticketWallHasVerb;
  return `${post.flag} ${post.username} ${verb} ${post.summary}`;
}

export function HeroBuyTicker({ posts, tr }: { posts: TicketWallPost[]; tr: Translations }) {
  const lines =
    posts.length > 0 ? posts.map(p => formatTicketWallLine(p, tr)) : [tr.heroBuyTickerEmpty];
  const track = [...lines, ...lines];

  return (
    <div className="relative z-10 border-t border-sky-500/25 bg-pitch-950/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="hidden shrink-0 items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 sm:inline-flex">
          <Search className="h-3 w-3" />
          {tr.heroBuyTickerLabel}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
          <div className="flex w-max animate-buy-ticker items-center gap-10 whitespace-nowrap">
            {track.map((line, i) => (
              <span key={`${i}-${line}`} className="text-sm text-gray-300">
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketSellPostCard({ post, tr, lang }: { post: TicketWallPost; tr: Translations; lang: Lang }) {
  const p = post.payload as TicketSellPayload | undefined;
  const schedule = primaryScheduleMatchForSellPost(post);
  const allRes = resolvedSellMatches(post);
  const extra = allRes.length > 1 ? allRes.length - 1 : 0;
  const country = schedule ? hostCountryForCity(schedule.city) : undefined;
  const price = sellPriceLine(post, tr);
  const desc = sellUserDescription(post);
  const waDigits = getPostWhatsapp(post);
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(tr.ticketWhatsappPrefill(whatsappPrefillContext(post)))}`
    : null;
  const qty = p?.quantity != null && p.quantity >= 1 ? p.quantity : null;
  const metaLine = schedule
    ? [country, schedule.city, schedule.stadium].filter(Boolean).join(' · ')
    : null;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-pitch-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-900/10 ${
        post.isUser ? 'ring-1 ring-gold-500/30' : ''
      }`}
    >
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="mb-2.5 flex items-start justify-between gap-3">
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
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold leading-tight tabular-nums text-gold-300">{price || '—'}</p>
            {qty != null ? (
              <p className="mt-0.5 text-[10px] text-gray-500">
                {tr.ticketQty(qty)}
                {p?.category?.trim() ? ` · ${p.category.trim()}` : ''}
              </p>
            ) : null}
          </div>
        </div>

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

        <TicketPostDetails text={desc} tr={tr} />

        <div className="mt-3 space-y-2 border-t border-gray-700/40 pt-3">
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

function TicketBuyPostCard({ post, tr }: { post: TicketWallPost; tr: Translations }) {
  const p = post.payload as TicketBuyPayload | undefined;
  const body = p?.targetMatch?.trim() ? p.targetMatch.trim() : post.summary;
  const budget = p?.budget?.trim();
  const waDigits = getPostWhatsapp(post);
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(tr.ticketWhatsappPrefill(whatsappPrefillContext(post)))}`
    : null;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-pitch-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-900/10 ${
        post.isUser ? 'ring-1 ring-sky-500/30' : ''
      }`}
    >
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300/90">
              <Search className="h-3 w-3 shrink-0" />
              {tr.tabTicketBuy}
            </span>
            {post.isUser ? (
              <span className="rounded bg-grass-500/15 px-1.5 py-px text-[10px] font-medium text-grass-300/90">
                {tr.ticketWallYourPost}
              </span>
            ) : null}
          </div>
          {budget ? (
            <p className="shrink-0 text-right text-sm font-bold tabular-nums text-sky-300">{budget}</p>
          ) : null}
        </div>

        <p className="text-sm font-semibold leading-snug text-gray-100">
          <span className="mr-1.5" aria-hidden>
            {post.flag}
          </span>
          {post.username}
          <span className="font-normal text-gray-500"> · {tr.ticketWallSeekingVerb}</span>
        </p>
        <TicketPostDetails text={body} tr={tr} className="mt-2" tone="buy" />
        {p?.quantity != null && p.quantity >= 1 ? (
          <p className="mt-1.5 text-[11px] text-gray-500">
            {tr.ticketQty(p.quantity)}
            {p.category?.trim() ? ` · ${p.category.trim()}` : ''}
          </p>
        ) : null}

        <div className="mt-3 space-y-2 border-t border-gray-700/40 pt-3">
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


export function useTicketWall(_lang: Lang) {
  const [userPosts, setUserPosts] = useState<TicketWallPost[]>(() => loadUserTicketPosts());

  const handlePost = useCallback((post: TicketWallPost) => {
    persistUserTicketPost(post);
    setUserPosts(prev => [post, ...prev]);
    return post;
  }, []);

  const { buyPosts, sellPosts } = useMemo(() => {
    const merged = [...userPosts, ...seedTicketWallPosts].sort((a, b) => b.createdAt - a.createdAt);
    return {
      buyPosts: merged.filter(p => p.kind === 'buy'),
      sellPosts: merged.filter(p => p.kind === 'sell'),
    };
  }, [userPosts]);

  return { userPosts, handlePost, buyPosts, sellPosts };
}

export { TicketPostFormModal as TicketPostModal } from './TicketPostFormModal';

export function TicketPostGrid({
  kind,
  posts,
  tr,
  lang,
  activeCity = null,
}: {
  kind: TicketWallKind;
  posts: TicketWallPost[];
  tr: Translations;
  lang: Lang;
  activeCity?: string | null;
}) {
  const isSell = kind === 'sell';
  const visible = useMemo(() => {
    if (!isSell) return posts;
    if (!activeCity) return posts;
    return posts.filter(p => sellPostPassesCityFilter(p, activeCity));
  }, [isSell, posts, activeCity]);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700/60 bg-pitch-800/40 px-6 py-14 text-center text-sm text-gray-500">
        {isSell ? tr.ticketWallEmptySell : tr.ticketWallEmptyBuy}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(p =>
        p.kind === 'sell' ? (
          <TicketSellPostCard key={p.id} post={p} tr={tr} lang={lang} />
        ) : (
          <TicketBuyPostCard key={p.id} post={p} tr={tr} />
        ),
      )}
    </div>
  );
}
