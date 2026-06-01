import type { TicketSellPayload } from './ticketPostForm';
import type { TicketWallPost } from './ticketPosts';

export function asSellPayload(post: TicketWallPost): TicketSellPayload | null {
  if (post.kind !== 'sell') return null;
  const p = post.payload;
  if (!p || !('matches' in p)) return null;
  return p as TicketSellPayload;
}

export function postHasPlatformGuarantee(post: TicketWallPost): boolean {
  const p = asSellPayload(post);
  return Boolean(p?.platformGuarantee && p.verifiedSellerId);
}

export function whatsappDigitsMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  if (!da || !db) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
}
