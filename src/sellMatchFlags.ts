import { matches } from './data';
import type { TicketWallPost } from './ticketPosts';
import type { TicketSellPayload } from './ticketPostForm';

const MATCH_NUM_RE = /Match\s+(\d+)/i;

function sellPayload(post: TicketWallPost): TicketSellPayload | null {
  if (post.kind !== 'sell') return null;
  const p = post.payload;
  if (p && typeof p === 'object' && 'matches' in p && Array.isArray((p as TicketSellPayload).matches)) {
    return p as TicketSellPayload;
  }
  return null;
}

function extractMatchNumbers(post: TicketWallPost): number[] {
  const payload = sellPayload(post);
  const lines = payload?.matches?.length ? payload.matches : [post.summary];
  const nums: number[] = [];
  for (const line of lines) {
    const m = String(line).match(MATCH_NUM_RE);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

/** First scheduled match on a sell post → team flags for share / OG / DB display. */
export function primaryMatchFlagsForSellPost(
  post: TicketWallPost,
): { flag1: string; flag2: string } | null {
  const nums = extractMatchNumbers(post);
  const n = nums[0];
  if (!n) return null;
  const m = matches.find(x => x.matchNumber === n);
  if (!m) return null;
  return { flag1: m.flag1, flag2: m.flag2 };
}
