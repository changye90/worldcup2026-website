import {
  buildOgHtml,
  fetchTicketRow,
  isSeoCrawler,
  ogDescriptionForPost,
  ogTitleForPost,
} from './ogTicket';
import { crawlerMetaForRequest } from './seoPages';
import { resolveSupabaseEnv } from './supabaseEnv';

const SPA_PATHS = new Set(['/', '/index.html', '/tickets', '/cars', '/hotels', '/odds', '/guides']);

function parseTicketPostIdFromPath(pathname: string): string | null {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/index.html') return null;
  const m = p.match(/^\/tickets\/([^/]+)$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).trim() || null;
  } catch {
    return null;
  }
}

function isSpaPath(path: string): boolean {
  if (SPA_PATHS.has(path)) return true;
  return parseTicketPostIdFromPath(path) != null;
}

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Optional canonical origin, e.g. https://okcopa.com */
  SITE_ORIGIN?: string;
}

function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/index.html' ? '/' : p;
}

export const onRequest: PagesFunction<Env> = async context => {
  const ua = context.request.headers.get('User-Agent') ?? '';
  if (!isSeoCrawler(ua)) {
    return context.next();
  }

  const url = new URL(context.request.url);
  const path = normalizePath(url.pathname);
  if (!isSpaPath(path)) {
    return context.next();
  }

  const ticketId = parseTicketPostIdFromPath(path) || url.searchParams.get('ticket')?.trim();
  const origin = (context.env.SITE_ORIGIN || url.origin).replace(/\/$/, '');
  const pageUrl = `${origin}${url.pathname}${url.search}`;
  const brandImage = `${origin}/og/brand`;

  if (ticketId) {
    const imageUrl = `${origin}/og/ticket.jpg?id=${encodeURIComponent(ticketId)}`;
    const supabase = resolveSupabaseEnv(context.env);

    let title = 'OKcopa · World Cup 2026 Tickets';
    let description = 'Fan ticket listings for FIFA World Cup 2026 — buy and sell on OKcopa.';

    if (supabase) {
      const row = await fetchTicketRow(ticketId, supabase.url, supabase.key);
      if (row) {
        title = ogTitleForPost(row);
        description = ogDescriptionForPost(row);
      }
    }

    const html = buildOgHtml({
      title,
      description,
      pageUrl,
      imageUrl,
      redirectUrl: pageUrl,
      canonicalUrl: pageUrl.split('#')[0],
    });
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const tabQuery = url.searchParams.get('tab');
  const meta = crawlerMetaForRequest(path, tabQuery);
  const html = buildOgHtml({
    title: meta.title,
    description: meta.description,
    pageUrl,
    imageUrl: brandImage,
    redirectUrl: pageUrl,
    canonicalUrl: pageUrl.split('#')[0],
  });
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
