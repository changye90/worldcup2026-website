import type { Translations } from './i18n';
import type { TicketSellPayload, TicketBuyPayload } from './ticketPostForm';
import { formatCategorySeatLine } from './ticketPostForm';
import type { TicketWallPost } from './ticketPosts';

const TICKET_PARAM = 'ticket';

export function getTicketIdFromUrl(url: URL = new URL(window.location.href)): string | null {
  const id = url.searchParams.get(TICKET_PARAM)?.trim();
  return id || null;
}

export function buildTicketShareUrl(post: TicketWallPost, baseUrl?: string): string {
  const url = new URL(baseUrl ?? window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(TICKET_PARAM, post.id);
  return url.toString();
}

export function clearTicketShareFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(TICKET_PARAM)) return;
  url.searchParams.delete(TICKET_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
}

/** "Match 16 · A vs B" → "Match 16 - A vs B" for share copy. */
function formatShareMatchLine(raw: string): string {
  const s = raw.trim();
  const dot = s.indexOf('·');
  if (dot > 0 && /^Match\s+\d+/i.test(s)) {
    return `${s.slice(0, dot).trim()} - ${s.slice(dot + 1).trim()}`;
  }
  return s;
}

function sellShareMatchLine(post: TicketWallPost): string {
  const p = post.payload as TicketSellPayload | undefined;
  if (p?.matches?.length) return formatShareMatchLine(p.matches[0]);
  const first = post.summary.split(' · ')[0]?.trim();
  return first || post.summary;
}

function sellShareCategoryQtyLine(p: TicketSellPayload): string {
  const parts: string[] = [];
  if (p.category?.trim()) parts.push(p.category.trim());
  parts.push(`${p.quantity} Ticket${p.quantity !== 1 ? 's' : ''}`);
  const seat = formatCategorySeatLine(p);
  if (seat) parts.push(seat);
  return parts.join(' · ');
}

function sellSharePriceLine(p: TicketSellPayload): string {
  if (p.priceType === 'negotiable') return 'Negotiable';
  if (p.priceAmount != null && Number.isFinite(p.priceAmount)) return `$${p.priceAmount} USD`;
  return '—';
}

function buildSellShareBody(post: TicketWallPost, tr: Translations): string {
  const p = post.payload as TicketSellPayload | undefined;
  const lines: string[] = [tr.ticketShareSellIntro, ''];

  lines.push(`🏟️ ${tr.ticketShareSellMatchLabel}: ${sellShareMatchLine(post)}`);

  if (p) {
    lines.push(`🎫 ${tr.ticketShareSellCategoryLabel}: ${sellShareCategoryQtyLine(p)}`);
    lines.push(`💰 ${tr.ticketShareSellPriceLabel}: ${sellSharePriceLine(p)}`);
  } else {
    lines.push(`🎫 ${tr.ticketShareSellCategoryLabel}: ${post.summary}`);
  }

  lines.push(
    '',
    tr.ticketShareSellLinkCta,
    '',
    tr.ticketShareSellPlatformPitch,
  );
  return lines.join('\n');
}

function buildBuyShareBody(post: TicketWallPost, tr: Translations): string {
  const p = post.payload as TicketBuyPayload | undefined;
  const lines: string[] = [tr.ticketShareBuyIntro, ''];

  if (p) {
    lines.push(`🏟️ ${tr.ticketShareBuyTargetLabel}: ${p.targetMatch.trim()}`);
    const qtyParts = [`${p.quantity} Ticket${p.quantity !== 1 ? 's' : ''}`];
    if (p.category?.trim()) qtyParts.unshift(p.category.trim());
    const seat = formatCategorySeatLine(p);
    if (seat) qtyParts.push(seat);
    lines.push(`🎫 ${tr.ticketShareSellCategoryLabel}: ${qtyParts.join(' · ')}`);
    if (p.budget?.trim()) {
      lines.push(`💰 ${tr.ticketShareBuyBudgetLabel}: ${p.budget.trim()}`);
    }
  } else {
    lines.push(`🏟️ ${tr.ticketShareBuyTargetLabel}: ${post.summary}`);
  }

  lines.push(
    '',
    tr.ticketShareSellLinkCta,
    '',
    tr.ticketShareSellPlatformPitch,
  );
  return lines.join('\n');
}

export function ticketShareTitle(post: TicketWallPost, tr: Translations): string {
  const kind = post.kind === 'buy' ? tr.tabTicketBuy : tr.tabTicketSell;
  return `OKcopa · ${kind} · ${post.summary}`;
}

/** Part 1: listing details; part 2: platform trust pitch (no URL — appended on share). */
export function ticketShareText(post: TicketWallPost, tr: Translations): string {
  if (post.kind === 'sell') return buildSellShareBody(post, tr);
  return buildBuyShareBody(post, tr);
}

export function buildTicketShareMessage(post: TicketWallPost, tr: Translations, baseUrl?: string): string {
  const url = buildTicketShareUrl(post, baseUrl);
  return `${ticketShareText(post, tr)}\n\n${tr.ticketShareSellLinkCue}\n${url}`;
}

export async function shareTicketPost(post: TicketWallPost, tr: Translations): Promise<'shared' | 'copied'> {
  const message = buildTicketShareMessage(post, tr);
  const title = ticketShareTitle(post, tr);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: message });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'copied';
    }
  }

  await navigator.clipboard.writeText(message);
  return 'copied';
}

export function scrollToTicketPost(id: string): void {
  document.getElementById(ticketPostElementId(id))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function ticketPostElementId(id: string): string {
  return `ticket-post-${id}`;
}
