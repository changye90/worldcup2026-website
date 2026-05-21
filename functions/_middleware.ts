import {
  buildOgHtml,
  fetchTicketRow,
  isLinkPreviewBot,
  ogDescriptionForPost,
  ogTitleForPost,
} from './ogTicket';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Optional canonical origin, e.g. https://okcopa.com */
  SITE_ORIGIN?: string;
}

export const onRequest: PagesFunction<Env> = async context => {
  const ua = context.request.headers.get('User-Agent') ?? '';
  if (!isLinkPreviewBot(ua)) {
    return context.next();
  }

  const url = new URL(context.request.url);
  const ticketId = url.searchParams.get('ticket')?.trim();
  if (!ticketId) {
    return context.next();
  }

  const origin = (context.env.SITE_ORIGIN || url.origin).replace(/\/$/, '');
  const pageUrl = `${origin}${url.pathname}${url.search}`;
  const imageUrl = `${origin}/og/ticket?id=${encodeURIComponent(ticketId)}`;
  const redirectUrl = pageUrl;

  const supabaseUrl = context.env.SUPABASE_URL;
  const anonKey = context.env.SUPABASE_ANON_KEY;

  let title = 'OKcopa · World Cup 2026 Tickets';
  let description = 'Fan ticket listings for FIFA World Cup 2026 — buy and sell on OKcopa.';

  if (supabaseUrl && anonKey) {
    const row = await fetchTicketRow(ticketId, supabaseUrl, anonKey);
    if (row) {
      title = ogTitleForPost(row);
      description = ogDescriptionForPost(row);
    }
  }

  const html = buildOgHtml({ title, description, pageUrl, imageUrl, redirectUrl });
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
