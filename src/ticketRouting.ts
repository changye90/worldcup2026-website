/** Path-based ticket post URLs: /tickets/{postId} */

export function parseTicketPostIdFromPath(pathname: string): string | null {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/index.html') return null;
  const m = p.match(/^\/tickets\/([^/]+)$/);
  if (!m) return null;
  try {
    const id = decodeURIComponent(m[1]).trim();
    return id || null;
  } catch {
    return null;
  }
}

export function buildTicketPostPath(postId: string): string {
  return `/tickets/${encodeURIComponent(postId)}`;
}

export function buildTicketPostPageUrl(postId: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://okcopa.com');
  return `${base.replace(/\/$/, '')}${buildTicketPostPath(postId)}`;
}

/** Legacy ?ticket= on /tickets → /tickets/{id} */
export function migrateLegacyTicketQuery(url: URL = new URL(window.location.href)): boolean {
  const q = url.searchParams.get('ticket')?.trim();
  if (!q || parseTicketPostIdFromPath(url.pathname)) return false;
  const tabPath = url.pathname.replace(/\/$/, '') || '/';
  if (tabPath !== '/tickets' && tabPath !== '/') return false;
  url.pathname = buildTicketPostPath(q);
  url.searchParams.delete('ticket');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
  return true;
}
