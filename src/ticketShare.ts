import type { Translations } from './i18n';
import { buildTicketPostPath, parseTicketPostIdFromPath } from './ticketRouting';
import type { TicketWallPost } from './ticketPosts';

const TICKET_PARAM = 'ticket';

const DEFAULT_SHARE_ORIGIN = 'https://okcopa.com';

/** Public ticket links must use production origin (Facebook rejects localhost). */
export function ticketShareOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (!/^(localhost|127\.)/i.test(window.location.hostname)) {
      return origin;
    }
  }
  return DEFAULT_SHARE_ORIGIN;
}

export function getTicketIdFromUrl(url: URL = new URL(window.location.href)): string | null {
  const fromPath = parseTicketPostIdFromPath(url.pathname);
  if (fromPath) return fromPath;
  const id = url.searchParams.get(TICKET_PARAM)?.trim();
  return id || null;
}

export function buildTicketShareUrl(post: TicketWallPost, baseUrl?: string): string {
  const origin = baseUrl
    ? new URL(baseUrl).origin
    : ticketShareOrigin();
  const url = new URL(`${origin.replace(/\/$/, '')}${buildTicketPostPath(post.id)}`);
  url.searchParams.set('ref', 'share');
  return url.toString();
}

export function buildWhatsAppShareUrl(post: TicketWallPost, tr: Translations): string {
  const message = buildTicketShareMessage(post, tr);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildXShareUrl(post: TicketWallPost, tr: Translations): string {
  const pageUrl = buildTicketShareUrl(post);
  const text = ticketShareTitle(post, tr);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
}

export function ticketFacebookQuote(post: TicketWallPost, tr: Translations): string {
  if (post.kind === 'sell') {
    return `I posted this World Cup ticket on OKcopa: ${post.summary}. Open the listing and contact me on WhatsApp.`;
  }
  return `I'm looking for this World Cup ticket on OKcopa: ${post.summary}. Open the listing and contact me on WhatsApp.`;
}

export function buildFacebookShareUrl(post: TicketWallPost, tr: Translations): string {
  const page = buildTicketShareUrl(post);
  const quote = ticketFacebookQuote(post, tr);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(page)}&quote=${encodeURIComponent(quote)}`;
}

export function clearTicketShareFromUrl(): void {
  const url = new URL(window.location.href);
  if (parseTicketPostIdFromPath(url.pathname)) {
    url.pathname = '/tickets';
    url.search = '';
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', next);
    return;
  }
  if (!url.searchParams.has(TICKET_PARAM)) return;
  url.searchParams.delete(TICKET_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
}

export function ticketShareTitle(post: TicketWallPost, tr: Translations): string {
  const kind = post.kind === 'buy' ? tr.tabTicketBuy : tr.tabTicketSell;
  return `OKcopa · ${kind} · ${post.summary}`;
}

/** Platform pitch only — ticket details show in the link preview card. */
export function ticketShareText(post: TicketWallPost, tr: Translations): string {
  return post.kind === 'sell' ? tr.ticketShareSellBody : tr.ticketShareBuyBody;
}

export function buildTicketShareMessage(post: TicketWallPost, tr: Translations, baseUrl?: string): string {
  const url = buildTicketShareUrl(post, baseUrl);
  return `${url}\n\n${ticketShareText(post, tr)}`;
}

export async function shareTicketPost(post: TicketWallPost, tr: Translations): Promise<'shared' | 'copied'> {
  const pageUrl = buildTicketShareUrl(post);
  const title = ticketShareTitle(post, tr);
  const text = ticketShareText(post, tr);
  const message = `${pageUrl}\n\n${text}`;

  if (typeof navigator.share === 'function') {
    // Facebook ignores URL embedded in `text` — pass `url` separately (OG card = preview).
    const shareData: ShareData = { title, text, url: pageUrl };
    try {
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return 'shared';
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'copied';
    }
  }

  await navigator.clipboard.writeText(message);
  return 'copied';
}

export function scrollToTicketPost(
  id: string,
  opts?: { behavior?: ScrollBehavior },
): void {
  document.getElementById(ticketPostElementId(id))?.scrollIntoView({
    behavior: opts?.behavior ?? 'smooth',
    block: 'center',
  });
}

export function ticketPostElementId(id: string): string {
  return `ticket-post-${id}`;
}
