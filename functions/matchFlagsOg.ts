import type { TicketOgRow } from './ogTicket';
import matchesOg from './data/matches-og.json';

interface OgMatchSlim {
  matchNumber: number;
  flag1: string;
  flag2: string;
}

const MATCH_NUM_RE = /Match\s+(\d+)/i;
const matches = matchesOg as OgMatchSlim[];

function findMatch(n: number): OgMatchSlim | undefined {
  return matches.find(m => m.matchNumber === n);
}

function extractMatchNumbers(texts: string[]): number[] {
  const nums: number[] = [];
  for (const line of texts) {
    const m = String(line).match(MATCH_NUM_RE);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

export function primaryMatchFlagsFromRow(row: TicketOgRow): { flag1: string; flag2: string } | null {
  if (row.kind !== 'sell') return null;
  const p = row.payload;
  const matchLines =
    p && typeof p === 'object' && Array.isArray((p as { matches?: string[] }).matches)
      ? ((p as { matches: string[] }).matches)
      : [row.summary ?? ''];
  const nums = extractMatchNumbers(matchLines);
  const primary = nums.length ? findMatch(nums[0]) : undefined;
  if (!primary) return null;
  return { flag1: primary.flag1, flag2: primary.flag2 };
}
