import type { TicketOgRow } from './ogTicket';
import matchesOg from './data/matches-og.json';

export interface OgMatchSlim {
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  flag1: string;
  flag2: string;
  city: string;
  stadium: string;
  date: string;
  kickoffTime: string;
  country: string;
}

export interface OgCardContent {
  badge: string;
  headline: string;
  meta?: string;
  kickoff?: string;
  detail: string;
  price?: string;
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

function formatKickoff(m: OgMatchSlim): string {
  const [hh, mm] = m.kickoffTime.split(':').map(Number);
  const iso = `${m.date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sellPayload(row: TicketOgRow): Record<string, unknown> | null {
  const p = row.payload;
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
}

function sellPriceLine(p: Record<string, unknown>): string {
  if (p.priceType === 'negotiable') return 'Negotiable';
  const amount = p.priceAmount;
  if (typeof amount === 'number' && Number.isFinite(amount)) return `$${amount} USD`;
  return '';
}

export function cardContentFromRow(row: TicketOgRow): OgCardContent {
  if (row.kind === 'buy') {
    const p = sellPayload(row); // payload shape for buy posts
    const target = typeof p?.targetMatch === 'string' ? p.targetMatch.trim() : row.summary;
    const qty = typeof p?.quantity === 'number' ? p.quantity : null;
    const category = typeof p?.category === 'string' ? p.category.trim() : '';
    const seat = typeof p?.seatDetails === 'string' ? p.seatDetails.trim() : '';
    const budget = typeof p?.budget === 'string' ? p.budget.trim() : '';
    const detailParts: string[] = [];
    if (qty != null && qty >= 1) detailParts.push(`${qty} ticket${qty !== 1 ? 's' : ''}`);
    if (category) detailParts.push(category);
    if (seat) detailParts.push(seat);
    return {
      badge: 'LOOKING FOR TICKETS',
      headline: `${row.flag?.trim() || '🏳️'} ${row.username?.trim() || 'Fan'}`,
      detail: target || row.summary || '',
      price: budget || undefined,
    };
  }

  const p = sellPayload(row);
  const matchLines = Array.isArray(p?.matches) ? (p.matches as string[]) : [row.summary];
  const nums = extractMatchNumbers(matchLines.length ? matchLines : [row.summary]);
  const primary = nums.length ? findMatch(nums[0]) : undefined;
  const qty = typeof p?.quantity === 'number' ? p.quantity : null;
  const category = typeof p?.category === 'string' ? p.category.trim() : '';
  const seat = typeof p?.seatDetails === 'string' ? p.seatDetails.trim() : '';

  const detailParts: string[] = [];
  if (primary) {
    detailParts.push(`Match ${primary.matchNumber} · ${primary.homeTeam} vs ${primary.awayTeam}`);
  } else if (matchLines[0]) {
    detailParts.push(matchLines[0]);
  }
  if (qty != null && qty >= 1) detailParts.push(`${qty} ticket${qty !== 1 ? 's' : ''}`);
  if (category) detailParts.push(category);
  if (seat) detailParts.push(seat);

  if (primary) {
    const meta = [primary.country, primary.city, primary.stadium].filter(Boolean).join(' · ');
    return {
      badge: 'TICKETS FOR SALE',
      headline: `${primary.flag1} ${primary.homeTeam} vs ${primary.awayTeam} ${primary.flag2}`,
      meta,
      kickoff: formatKickoff(primary),
      detail: detailParts.join(' · '),
      price: p ? sellPriceLine(p) : undefined,
    };
  }

  return {
    badge: 'TICKETS FOR SALE',
    headline: row.summary || 'World Cup 2026 tickets',
    detail: detailParts.join(' · ') || row.detail || '',
    price: p ? sellPriceLine(p) : undefined,
  };
}
