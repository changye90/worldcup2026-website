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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ogTitleForPost(row: TicketOgRow): string {
  const kind = row.kind === 'buy' ? 'Looking for tickets' : 'Tickets for sale';
  const summary = (row.summary || '').trim();
  return summary ? `OKcopa · ${kind} · ${summary}` : `OKcopa · ${kind}`;
}

export function ogDescriptionForPost(row: TicketOgRow): string {
  const flag = resolveTicketPostFlag(row, primaryMatchFlagsFromRow(row));
  const user = row.username?.trim() || 'Fan';
  const detail = (row.detail || row.summary || '').trim().replace(/\s+/g, ' ');
  const verb = row.kind === 'buy' ? 'is looking for' : 'has tickets for';
  const head = `${flag} ${user} ${verb}`;
  const body = detail.slice(0, 200);
  return body.length > head.length + 4 ? `${head} — ${body}` : head;
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
}): string {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const pageUrl = escapeHtml(opts.pageUrl);
  const imageUrl = escapeHtml(opts.imageUrl);
  const redirectUrl = escapeHtml(opts.redirectUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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
