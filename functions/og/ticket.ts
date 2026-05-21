import { cardContentFromRow } from '../ogCardContent';
import { buildCardSvg } from '../ogCardSvg';
import { fetchTicketRow } from '../ogTicket';
import { svgToPng } from '../ogPng';

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

  if (id && context.env.SUPABASE_URL && context.env.SUPABASE_ANON_KEY) {
    const row = await fetchTicketRow(id, context.env.SUPABASE_URL, context.env.SUPABASE_ANON_KEY);
    if (row) svg = buildCardSvg(cardContentFromRow(row));
  }

  try {
    const png = await svgToPng(svg);
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[og/ticket] PNG render failed', err);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};
