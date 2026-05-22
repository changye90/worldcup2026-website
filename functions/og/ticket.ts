import { cardContentFromRow } from '../ogCardContent';
import { buildCardSvg } from '../ogCardSvg';
import { getOgFallbackPng } from '../ogFallbackPng';
import { svgToPng } from '../ogPng';
import { resolveSupabaseEnv } from '../supabaseEnv';
import { fetchTicketRow } from '../ogTicket';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const MIN_PNG_BYTES = 18_000;

const FALLBACK_SVG = buildCardSvg({
  badge: 'OKCOPA',
  headline: 'World Cup 2026 tickets',
  detail: 'Fan buy & sell listings on OKcopa',
});

function pngResponse(png: Uint8Array, cacheSeconds = 3600): Response {
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
    },
  });
}

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
    if (png.byteLength >= MIN_PNG_BYTES) {
      return pngResponse(png);
    }
    console.error('[og/ticket] PNG too small, using embedded fallback', png.byteLength);
  } catch (err) {
    console.error('[og/ticket] PNG render failed, using embedded fallback', err);
  }

  return pngResponse(getOgFallbackPng(), 300);
};
