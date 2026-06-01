import type { TicketBuyPayload } from './ticketPostForm';
import { isValidWhatsapp } from './ticketPostForm';
import type { TicketWallPost } from './ticketPosts';

/** Soft-archived duplicate rows kept in DB for audit — never show on the wall. */
export function ticketWallPostIsJunk(post: TicketWallPost): boolean {
  const text = `${post.summary}\n${post.detail}`.toLowerCase();
  return text.includes('archived duplicate');
}

export function ticketWallPostIsArchived(post: TicketWallPost): boolean {
  const p = post.payload as { listingStatus?: string } | undefined;
  return p?.listingStatus === 'archived';
}

/** Real fan buy request (Wanted tab): must have target match + WhatsApp. */
export function ticketWallPostIsValidBuy(post: TicketWallPost): boolean {
  if (post.kind !== 'buy' || ticketWallPostIsJunk(post)) return false;
  const p = post.payload as TicketBuyPayload | undefined;
  const target = p?.targetMatch?.trim();
  if (!target) return false;
  return isValidWhatsapp(p.whatsapp || '');
}

export function filterVisibleTicketWallPosts(posts: TicketWallPost[]): TicketWallPost[] {
  return posts.filter(p => !ticketWallPostIsJunk(p) && !ticketWallPostIsArchived(p));
}

export function filterVisibleBuyPosts(posts: TicketWallPost[]): TicketWallPost[] {
  return posts.filter(ticketWallPostIsValidBuy);
}
