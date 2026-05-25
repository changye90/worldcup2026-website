import { buildCardSvg } from '../ogCardSvg';
import { cardContentFromRow } from '../ogCardContent';
import { getOgFallbackPng } from '../ogFallbackPng';
import { svgToPng } from '../ogPng';
import { fetchTicketRow } from '../ogTicket';
import { resolveSupabaseEnv } from '../supabaseEnv';

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600',
} as const;

const FALLBACK_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=300',
} as const;

const MIN_PNG_BYTES = 20_000;

export const onRequest: PagesFunction = async context => {
  const id = new URL(context.request.url).searchParams.get('id')?.trim();
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  let card = {
    badge: 'TICKETS FOR SALE',
    homeTeam: 'New Zealand',
    awayTeam: 'Belgium',
    flag1: '🇳🇿',
    flag2: '🇧🇪',
    meta: 'Canada · Vancouver · BC Place',
    kickoff: 'Fri, Jun 26, 8:00 PM',
    detail: 'Match 42 · 2 tickets',
    price: 'Negotiable',
  };

  const supabase = resolveSupabaseEnv(context.env);
  if (supabase) {
    const row = await fetchTicketRow(id, supabase.url, supabase.key);
    if (row) card = cardContentFromRow(row);
  }

  try {
    const png = await svgToPng(buildCardSvg(card));
    if (png.byteLength < MIN_PNG_BYTES) {
      throw new Error(`png too small: ${png.byteLength}`);
    }
    return new Response(png, { headers: PNG_HEADERS });
  } catch {
    const fallback = getOgFallbackPng();
    if (fallback.byteLength >= MIN_PNG_BYTES) {
      return new Response(fallback, { headers: FALLBACK_HEADERS });
    }
    const staticUrl = new URL('/og-ticket-fallback.png', context.request.url);
    return Response.redirect(staticUrl.toString(), 302);
  }
};
