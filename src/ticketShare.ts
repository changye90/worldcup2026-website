import type { Translations } from './i18n';
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

export function ticketShareTitle(post: TicketWallPost, tr: Translations): string {
  const kind =
    post.kind === 'buy' ? tr.tabTicketBuy : tr.tabTicketSell;
  return `OKcopa · ${kind} · ${post.summary}`;
}

export function ticketShareText(post: TicketWallPost, tr: Translations): string {
  const verb = post.kind === 'buy' ? tr.ticketWallSeekingVerb : tr.ticketWallHasVerb;
  return `${post.flag} ${post.username} ${verb} ${post.summary}`;
}

export async function shareTicketPost(post: TicketWallPost, tr: Translations): Promise<'shared' | 'copied'> {
  const url = buildTicketShareUrl(post);
  const title = ticketShareTitle(post, tr);
  const text = ticketShareText(post, tr);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'copied';
    }
  }

  await navigator.clipboard.writeText(url);
  return 'copied';
}

export function scrollToTicketPost(id: string): void {
  document.getElementById(ticketPostElementId(id))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function ticketPostElementId(id: string): string {
  return `ticket-post-${id}`;
}
