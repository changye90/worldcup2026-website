import type { TicketBuyPayload } from './ticketPostForm';
import { normalizeBudgetValue } from './ticketPostForm';
import type { TicketWallPost } from './ticketPosts';
import { matchInvolvesNation } from './matchNationFilter';
import {
  hostCountryForCity,
  resolvedSellMatches,
  sellHasFixedPrice,
} from './sellPostResolve';

/** Higher visibility for these nations (teams + Mexico host cities). */
const PRIORITY_NATIONS = ['Germany', 'England', 'Mexico'] as const;

const PRIORITY_TEXT = [
  'germany',
  'alemania',
  'alemanha',
  'england',
  'inglaterra',
  'mexico',
  'méxico',
  'mexico city',
  'guadalajara',
  'monterrey',
];

function postSearchText(post: TicketWallPost): string {
  if (post.kind === 'buy') {
    const p = post.payload as TicketBuyPayload | undefined;
    return `${p?.targetMatch || ''} ${post.summary} ${post.detail || ''}`.toLowerCase();
  }
  return `${post.summary} ${post.detail || ''}`.toLowerCase();
}

/** Sell: fixed USD price. Buy: budget present and not negotiable-only. */
export function postHasExplicitPrice(post: TicketWallPost): boolean {
  if (post.kind === 'sell') return sellHasFixedPrice(post);
  const p = post.payload as TicketBuyPayload | undefined;
  const budget = normalizeBudgetValue(p?.budget);
  if (!budget) return false;
  return budget.toLowerCase() !== 'negotiable';
}

export function postHasPriorityNation(post: TicketWallPost): boolean {
  if (post.kind === 'sell') {
    for (const m of resolvedSellMatches(post)) {
      for (const nation of PRIORITY_NATIONS) {
        if (matchInvolvesNation(m, nation)) return true;
      }
      if (hostCountryForCity(m.city) === 'Mexico') return true;
    }
  }
  const text = postSearchText(post);
  return PRIORITY_TEXT.some(tok => text.includes(tok));
}

/**
 * Wall order: explicit price first → priority nations → newest.
 * Posts without a clear price sink to the bottom within each group.
 */
export function sortTicketWallPosts(posts: TicketWallPost[]): TicketWallPost[] {
  return [...posts].sort((a, b) => {
    const priceRankA = postHasExplicitPrice(a) ? 0 : 1;
    const priceRankB = postHasExplicitPrice(b) ? 0 : 1;
    if (priceRankA !== priceRankB) return priceRankA - priceRankB;

    const nationRankA = postHasPriorityNation(a) ? 0 : 1;
    const nationRankB = postHasPriorityNation(b) ? 0 : 1;
    if (nationRankA !== nationRankB) return nationRankA - nationRankB;

    const dt = b.createdAt - a.createdAt;
    if (dt !== 0) return dt;
    return b.id.localeCompare(a.id);
  });
}
