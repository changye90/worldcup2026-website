import { primaryMatchFlagsFromRow } from './matchFlagsOg';
import { resolveTicketPostFlag } from './teamFlags';

export interface TicketOgRow {
  id: string;
  kind: 'buy' | 'sell';
  flag?: string | null;
  username?: string | null;
  summary?: string | null;
  detail?: string | null;
  payload?: Record<string, unknown> | null;
}

export function isLinkPreviewBot(userAgent: string): boolean {
  return /whatsapp|facebookexternalhit|facebot|meta-externalagent|facebookcatalog|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest/i.test(
    userAgent,
  );
}

/** Social preview + search crawlers that benefit from server-rendered meta HTML. */
export function isSeoCrawler(userAgent: string): boolean {
  return (
    isLinkPreviewBot(userAgent) ||
    /googlebot|google-inspectiontool|bingbot|duckduckbot|baiduspider|yandexbot|slurp|applebot/i.test(
      userAgent,
    )
  );
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ogTitleForPost(row: TicketOgRow): string {
  const summary = (row.summary || '').trim();
  if (summary) {
    const suffix =
      row.kind === 'buy'
        ? ' · World Cup 2026 tickets wanted · OKcopa'
        : ' · World Cup 2026 tickets for sale · OKcopa';
    return `${summary}${suffix}`;
  }
  return row.kind === 'buy'
    ? 'World Cup 2026 tickets wanted · OKcopa'
    : 'World Cup 2026 tickets for sale · OKcopa';
}

export function ogDescriptionForPost(row: TicketOgRow): string {
  const flag = resolveTicketPostFlag(row, primaryMatchFlagsFromRow(row));
  const user = row.username?.trim() || 'Fan';
  const detail = (row.detail || row.summary || '').trim().replace(/\s+/g, ' ');
  const verb = row.kind === 'buy' ? 'is looking for' : 'has tickets for';
  const head = `${flag} ${user} ${verb}`;
  const body = detail.slice(0, 220);
  const core = body.length > head.length + 4 ? `${head} — ${body}` : head;
  const prefix = 'FIFA World Cup 2026 fan-to-fan listing on OKcopa. ';
  return `${prefix}${core}`.slice(0, 320);
}

export async function fetchTicketRow(
  id: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<TicketOgRow | null> {
  const base = supabaseUrl.replace(/\/$/, '');
  const api = `${base}/rest/v1/ticket_wall_posts?id=eq.${encodeURIComponent(id)}&select=id,kind,flag,username,summary,detail,payload`;
  const res = await fetch(api, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as TicketOgRow[];
  const row = rows[0];
  if (!row || (row.kind !== 'buy' && row.kind !== 'sell')) return null;
  return row;
}

export function buildOgHtml(opts: {
  title: string;
  description: string;
  pageUrl: string;
  imageUrl: string;
  redirectUrl: string;
  canonicalUrl?: string;
}): string {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const pageUrl = escapeHtml(opts.pageUrl);
  const imageUrl = escapeHtml(opts.imageUrl);
  const redirectUrl = escapeHtml(opts.redirectUrl);
  const canonical = escapeHtml(opts.canonicalUrl ?? opts.pageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:alt" content="${title}" />
  <meta property="og:site_name" content="OKcopa" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
  <p><a href="${redirectUrl}">Open on OKcopa</a></p>
</body>
</html>`;
}
