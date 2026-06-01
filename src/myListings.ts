import type { TicketListingMeta } from './ticketPostForm';
import { getPostWhatsapp, whatsappDigits } from './ticketPostForm';
import { whatsappDigitsMatch } from './platformGuarantee';
import { ticketWallPostIsArchived } from './ticketWallFilters';
import type { TicketWallPost } from './ticketPosts';
import {
  loadUserTicketPosts,
  persistSharedTicketPost,
  persistUserTicketPost,
  removeUserTicketPost,
} from './ticketPosts';

export function payloadOwnerUserId(post: TicketWallPost): string | null {
  const p = post.payload as TicketListingMeta | undefined;
  return p?.ownerUserId?.trim() || null;
}

const MANAGE_WA_KEY = 'okcopa-manage-wa-v1';

export function loadSavedManageWhatsapp(): string {
  try {
    return localStorage.getItem(MANAGE_WA_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function saveManageWhatsapp(whatsapp: string): void {
  try {
    localStorage.setItem(MANAGE_WA_KEY, whatsapp.trim());
  } catch {
    /* ignore */
  }
}

function mergeActivePosts(lists: TicketWallPost[][]): TicketWallPost[] {
  const byId = new Map<string, TicketWallPost>();
  for (const list of lists) {
    for (const p of list) {
      if (!ticketWallPostIsArchived(p)) byId.set(p.id, p);
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/** Posts the signed-in user can manage on this device / account. */
export function postsForAccount(userId: string, wallPosts: TicketWallPost[]): TicketWallPost[] {
  const out: TicketWallPost[] = [];
  for (const p of [...wallPosts, ...loadUserTicketPosts()]) {
    if (ticketWallPostIsArchived(p)) continue;
    const owner = payloadOwnerUserId(p);
    if (owner === userId || (p.isUser && !owner)) out.push(p);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Find active wall posts that used this WhatsApp (guest or logged-in). */
export function postsForWhatsapp(whatsapp: string, wallPosts: TicketWallPost[]): TicketWallPost[] {
  if (whatsappDigits(whatsapp).length < 8) return [];
  const out: TicketWallPost[] = [];
  for (const p of [...wallPosts, ...loadUserTicketPosts()]) {
    if (ticketWallPostIsArchived(p)) continue;
    const postWa = getPostWhatsapp(p);
    if (!postWa || !whatsappDigitsMatch(postWa, whatsapp)) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export function listingsForManage(opts: {
  wallPosts: TicketWallPost[];
  userId?: string | null;
  whatsapp?: string | null;
}): TicketWallPost[] {
  const lists: TicketWallPost[][] = [];
  if (opts.userId) lists.push(postsForAccount(opts.userId, opts.wallPosts));
  const wa = opts.whatsapp?.trim();
  if (wa && whatsappDigits(wa).length >= 8) {
    lists.push(postsForWhatsapp(wa, opts.wallPosts));
  }
  return mergeActivePosts(lists);
}

export async function archiveMyListing(post: TicketWallPost): Promise<boolean> {
  const payload = {
    ...(post.payload ?? {}),
    listingStatus: 'archived' as const,
  };
  const archived: TicketWallPost = {
    ...post,
    payload,
  };
  removeUserTicketPost(post.id);
  const ok = await persistSharedTicketPost(archived);
  return ok;
}

export function attachOwnerToPost(post: TicketWallPost, ownerUserId: string | null): TicketWallPost {
  if (!ownerUserId) return post;
  return {
    ...post,
    payload: {
      ...(post.payload ?? {}),
      ownerUserId,
      listingStatus: 'active',
    },
  };
}
