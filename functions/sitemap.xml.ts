import { buildSitemapXml, fetchVisibleTicketEntries } from './sitemapBuild';
import { resolveSupabaseEnv } from './supabaseEnv';

export const onRequest: PagesFunction = async context => {
  const url = new URL(context.request.url);
  const origin = (context.env.SITE_ORIGIN || url.origin).replace(/\/$/, '');

  let tickets: Awaited<ReturnType<typeof fetchVisibleTicketEntries>> = [];
  const supabase = resolveSupabaseEnv(context.env);
  if (supabase) {
    try {
      tickets = await fetchVisibleTicketEntries(supabase.url, supabase.key);
    } catch {
      tickets = [];
    }
  }

  const xml = buildSitemapXml(origin, tickets);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
