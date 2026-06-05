export interface SitemapStaticPage {
  path: string;
  changefreq: string;
  priority: string;
}

export const SITEMAP_STATIC_PAGES: SitemapStaticPage[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/tickets', changefreq: 'hourly', priority: '0.95' },
  { path: '/wanted', changefreq: 'hourly', priority: '0.9' },
  { path: '/guides', changefreq: 'weekly', priority: '0.85' },
  { path: '/hotels', changefreq: 'daily', priority: '0.8' },
  { path: '/cars', changefreq: 'daily', priority: '0.8' },
  { path: '/odds', changefreq: 'weekly', priority: '0.6' },
];

export interface SitemapTicketEntry {
  id: string;
  createdAtMs: number;
}

interface TicketWallRow {
  id: string;
  summary?: string | null;
  detail?: string | null;
  payload?: Record<string, unknown> | null;
  created_at_ms: number;
}

const PAGE_SIZE = 1000;
const MAX_TICKET_URLS = 49_000;

function ticketWallPostIsJunk(row: Pick<TicketWallRow, 'summary' | 'detail'>): boolean {
  const text = `${row.summary ?? ''}\n${row.detail ?? ''}`.toLowerCase();
  return text.includes('archived duplicate');
}

function ticketWallPostIsArchived(row: Pick<TicketWallRow, 'payload'>): boolean {
  return row.payload?.listingStatus === 'archived';
}

export async function fetchVisibleTicketEntries(
  supabaseUrl: string,
  anonKey: string,
): Promise<SitemapTicketEntry[]> {
  const base = supabaseUrl.replace(/\/$/, '');
  const entries: SitemapTicketEntry[] = [];
  let offset = 0;

  while (entries.length < MAX_TICKET_URLS) {
    const api =
      `${base}/rest/v1/ticket_wall_posts` +
      `?select=id,summary,detail,payload,created_at_ms` +
      `&order=created_at_ms.desc` +
      `&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(api, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) break;

    const rows = (await res.json()) as TicketWallRow[];
    if (!rows.length) break;

    for (const row of rows) {
      if (!row.id || ticketWallPostIsJunk(row) || ticketWallPostIsArchived(row)) continue;
      entries.push({ id: row.id, createdAtMs: row.created_at_ms });
      if (entries.length >= MAX_TICKET_URLS) break;
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return entries;
}

function formatLastmod(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  return new Date(ms).toISOString().slice(0, 10);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(origin: string, tickets: SitemapTicketEntry[]): string {
  const base = origin.replace(/\/$/, '');
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const page of SITEMAP_STATIC_PAGES) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(`${base}${page.path}`)}</loc>`);
    lines.push(`    <changefreq>${page.changefreq}</changefreq>`);
    lines.push(`    <priority>${page.priority}</priority>`);
    lines.push('  </url>');
  }

  for (const ticket of tickets) {
    const loc = `${base}/tickets/${encodeURIComponent(ticket.id)}`;
    const lastmod = formatLastmod(ticket.createdAtMs);
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(loc)}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push('    <priority>0.7</priority>');
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}
