import type { Lang, Translations } from './i18n';
import type { TicketBuyPayload } from './ticketPostForm';
import type { TicketWallPost } from './ticketPosts';
import { buildTicketPostPageUrl } from './ticketRouting';
import {
  formatMatchKickoffDisplay,
  primaryScheduleMatchForSellPost,
  sellFixedPriceDisplay,
  sellHasFixedPrice,
  sellNotesExcludingStructured,
} from './sellPostResolve';

export function ticketDetailMatchLabel(post: TicketWallPost, tr: Translations): string {
  if (post.kind === 'sell') {
    const schedule = primaryScheduleMatchForSellPost(post);
    if (schedule) {
      return `${schedule.homeTeam} ${tr.ticketSellVs} ${schedule.awayTeam}`;
    }
  }
  if (post.kind === 'buy') {
    const p = post.payload as TicketBuyPayload | undefined;
    const target = p?.targetMatch?.trim();
    if (target) return target;
  }
  const head = post.summary.split('·')[0]?.trim();
  return head || post.summary;
}

export function ticketDetailSubhead(post: TicketWallPost, lang: Lang): string | null {
  if (post.kind === 'sell') {
    const schedule = primaryScheduleMatchForSellPost(post);
    if (!schedule) return null;
    const place = [schedule.stadium, schedule.city].filter(Boolean).join(', ');
    const when = formatMatchKickoffDisplay(schedule, lang);
    return [place, when].filter(Boolean).join(' · ');
  }
  if (post.kind === 'buy') {
    const p = post.payload as TicketBuyPayload | undefined;
    const bits = [p?.quantity, p?.category, p?.budget?.trim()].filter(Boolean);
    return bits.length ? bits.join(' · ') : null;
  }
  return null;
}

export function ticketPageSeoMeta(
  post: TicketWallPost,
  tr: Translations,
): { title: string; description: string } {
  const match = ticketDetailMatchLabel(post, tr);
  const title =
    post.kind === 'sell'
      ? tr.ticketDetailMetaTitleSell(match)
      : tr.ticketDetailMetaTitleBuy(match);

  const extras: string[] = [];
  if (post.kind === 'sell') {
    const schedule = primaryScheduleMatchForSellPost(post);
    if (schedule) {
      const place = [schedule.stadium, schedule.city].filter(Boolean).join(', ');
      if (place) extras.push(place);
    }
    if (sellHasFixedPrice(post)) extras.push(sellFixedPriceDisplay(post));
    const notes = sellNotesExcludingStructured(post, schedule ?? undefined);
    if (notes) extras.push(notes.replace(/\s+/g, ' ').slice(0, 120));
  } else {
    const p = post.payload as TicketBuyPayload | undefined;
    if (p?.budget?.trim()) extras.push(p.budget.trim());
    if (p?.category) extras.push(p.category);
  }
  const description =
    post.kind === 'sell'
      ? tr.ticketDetailMetaDescSell(match, extras.filter(Boolean).join(' · '))
      : tr.ticketDetailMetaDescBuy(match, extras.filter(Boolean).join(' · '));

  return { title, description };
}

export function ticketDetailSeoParagraphs(post: TicketWallPost, tr: Translations, lang: Lang): string[] {
  const match = ticketDetailMatchLabel(post, tr);
  let place = '';
  if (post.kind === 'sell') {
    const schedule = primaryScheduleMatchForSellPost(post);
    place = schedule?.city?.trim() || schedule?.stadium?.trim() || '';
  }
  const lead =
    post.kind === 'sell'
      ? tr.ticketDetailSeoLeadSell(match, place)
      : tr.ticketDetailSeoLeadBuy(match);
  const sub = ticketDetailSubhead(post, lang);
  const detailLine = sub ? `${lead} ${sub}.` : lead;
  return [detailLine, tr.ticketDetailSeoPlatform];
}

export function ticketDetailJsonLd(post: TicketWallPost, tr: Translations): Record<string, unknown> {
  const match = ticketDetailMatchLabel(post, tr);
  const { title, description } = ticketPageSeoMeta(post, tr);
  const url = buildTicketPostPageUrl(post.id);
  const origin = new URL(url).origin;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'OKcopa', item: origin },
          { '@type': 'ListItem', position: 2, name: tr.tabTickets, item: `${origin}/tickets` },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { '@type': 'WebSite', name: 'OKcopa', url: origin },
        about: {
          '@type': 'SportsEvent',
          name: 'FIFA World Cup 2026',
          sport: 'Soccer',
        },
      },
      {
        '@type': 'Product',
        name: match,
        description,
        url,
        category: 'FIFA World Cup 2026 match tickets',
        ...(post.kind === 'sell' && sellHasFixedPrice(post)
          ? {
              offers: {
                '@type': 'Offer',
                price: sellFixedPriceDisplay(post),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url,
              },
            }
          : {}),
      },
    ],
  };
}
