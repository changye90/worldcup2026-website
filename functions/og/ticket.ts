import { ogStaticJpegResponse } from '../ogFallback';
import { buildCardSvg } from '../ogCardSvg';
import { cardContentFromRow } from '../ogCardContent';
import { jpegResponse } from '../ogImageResponse';
import { MIN_OG_IMAGE_BYTES, svgToOgJpeg } from '../ogImage';
import { fetchTicketRow } from '../ogTicket';
import { resolveSupabaseEnv } from '../supabaseEnv';

const TICKET_FALLBACK = '/og-ticket-fallback.jpg';

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
    const jpeg = await svgToOgJpeg(buildCardSvg(card));
    if (jpeg.byteLength < MIN_OG_IMAGE_BYTES) {
      throw new Error(`jpeg too small: ${jpeg.byteLength}`);
    }
    return jpegResponse(jpeg);
  } catch (err) {
    console.error('og/ticket render failed', err);
    return ogStaticJpegResponse(context.request.url, TICKET_FALLBACK);
  }
};
