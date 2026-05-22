import { cardContentFromRow } from '../ogCardContent';
import { buildCardSvg } from '../ogCardSvg';
import { svgToPng } from '../ogPng';
import { resolveSupabaseEnv } from '../supabaseEnv';
import { fetchTicketRow } from '../ogTicket';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const FALLBACK_SVG = buildCardSvg({
  badge: 'OKCOPA',
  headline: 'World Cup 2026 tickets',
  detail: 'Fan buy & sell listings on OKcopa',
});

export const onRequest: PagesFunction<Env> = async context => {
  const id = new URL(context.request.url).searchParams.get('id')?.trim();
  let svg = FALLBACK_SVG;

  const supabase = resolveSupabaseEnv(context.env);
  if (id && supabase) {
    const row = await fetchTicketRow(id, supabase.url, supabase.key);
    if (row) svg = buildCardSvg(cardContentFromRow(row));
  }

  try {
    const png = await svgToPng(svg);
    // Empty render (no fonts) is ~14KB; real cards are larger.
    if (png.byteLength < 18_000) {
      console.error('[og/ticket] PNG too small — font render likely failed', png.byteLength);
      const fallbackUrl = new URL('/og-ticket-fallback.png', context.request.url);
      const fb = await fetch(fallbackUrl);
      if (fb.ok) {
        return new Response(await fb.arrayBuffer(), {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
        });
      }
    }
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[og/ticket] PNG render failed', err);
    const fallbackUrl = new URL('/og-ticket-fallback.png', context.request.url);
    const fb = await fetch(fallbackUrl);
    if (fb.ok) {
      return new Response(await fb.arrayBuffer(), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
      });
    }
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  }
};
