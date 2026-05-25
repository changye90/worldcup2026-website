import type { Match } from './matchTypes';
import { matches, cities } from './data';
import type { Lang } from './i18n';
import type { Translations } from './i18n';
import type { TicketWallPost } from './ticketPosts';
import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import type { TicketWallKind } from './ticketPosts';
import { whatsappDigits } from './ticketPostForm';

const MATCH_NUM_RE = /Match\s+(\d+)/i;

function listingBelongsToHostCity(listingCity: string, hostCity: string): boolean {
  if (listingCity === hostCity) return true;
  if (hostCity === 'Kansas City' && listingCity === 'Kansas') return true;
  return false;
}

export function hostCountryForCity(city: string): string | undefined {
  return cities.find(c => c.name === city)?.country;
}

export function findMatchByNumber(n: number): Match | undefined {
  return matches.find(m => m.matchNumber === n);
}

function sellPayload(post: TicketWallPost): TicketSellPayload | null {
  if (post.kind !== 'sell') return null;
  const p = post.payload;
  if (p && typeof p === 'object' && 'matches' in p && Array.isArray((p as TicketSellPayload).matches)) {
    return p as TicketSellPayload;
  }
  return null;
}

/** Match numbers mentioned in payload match lines or fallback summary. */
export function extractMatchNumbersFromSellPost(post: TicketWallPost): number[] {
  if (post.kind !== 'sell') return [];
  const payload = sellPayload(post);
  const lines = payload?.matches?.length ? payload.matches : [post.summary];
  const nums: number[] = [];
  for (const line of lines) {
    const m = String(line).match(MATCH_NUM_RE);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

export function resolvedSellMatches(post: TicketWallPost): Match[] {
  if (post.kind !== 'sell') return [];
  const seen = new Set<number>();
  const out: Match[] = [];
  for (const n of extractMatchNumbersFromSellPost(post)) {
    if (seen.has(n)) continue;
    seen.add(n);
    const m = findMatchByNumber(n);
    if (m) out.push(m);
  }
  return out;
}

export function primaryScheduleMatchForSellPost(post: TicketWallPost): Match | null {
  return resolvedSellMatches(post)[0] ?? null;
}

/** When a host city is selected, only posts linked to the schedule in that city appear. */
export function sellPostPassesCityFilter(post: TicketWallPost, activeCity: string | null): boolean {
  if (post.kind !== 'sell') return true;
  if (!activeCity) return true;
  const m = primaryScheduleMatchForSellPost(post);
  if (!m) return false;
  return listingBelongsToHostCity(m.city, activeCity);
}

/** When a schedule match is selected, only posts that list that match number appear. */
export function sellPostPassesMatchFilter(post: TicketWallPost, matchNumber: number | null): boolean {
  if (post.kind !== 'sell') return true;
  if (matchNumber == null) return true;
  return extractMatchNumbersFromSellPost(post).includes(matchNumber);
}

export function filterSellPosts(
  posts: TicketWallPost[],
  opts: { activeCity: string | null; activeMatchNumber: number | null },
): TicketWallPost[] {
  if (opts.activeMatchNumber != null) {
    return posts.filter(p => sellPostPassesMatchFilter(p, opts.activeMatchNumber));
  }
  if (opts.activeCity) {
    return posts.filter(p => sellPostPassesCityFilter(p, opts.activeCity));
  }
  return posts;
}

export function formatMatchKickoffDisplay(m: Match, lang: Lang): string {
  const [hh, mm] = m.kickoffTime.split(':').map(Number);
  const iso = `${m.date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const d = new Date(iso);
  const loc = lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US';
  return d.toLocaleString(loc, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function sellHasFixedPrice(post: TicketWallPost): boolean {
  const p = sellPayload(post);
  if (!p) return false;
  return p.priceType === 'fixed' && p.priceAmount != null && Number.isFinite(p.priceAmount);
}

export function sellPriceLine(post: TicketWallPost, tr: Translations): string {
  const p = sellPayload(post);
  if (!p) return '';
  if (p.priceType === 'negotiable') return tr.formPriceNegotiable;
  if (p.priceAmount != null && Number.isFinite(p.priceAmount)) return `$${p.priceAmount} USD`;
  return '';
}

export function sellFixedPriceDisplay(post: TicketWallPost): string | null {
  const p = sellPayload(post);
  if (!p || !sellHasFixedPrice(post)) return null;
  return `$${p.priceAmount} USD`;
}

/** Tokens from structured fields — used to strip duplicate lines from seller notes. */
export function sellStructuredDedupeTokens(
  post: TicketWallPost,
  schedule: Match | null,
): string[] {
  const p = sellPayload(post);
  const tokens: string[] = [];
  if (schedule) {
    tokens.push(
      schedule.homeTeam,
      schedule.awayTeam,
      schedule.city,
      schedule.stadium,
      hostCountryForCity(schedule.city) ?? '',
      `Match ${schedule.matchNumber}`,
    );
  }
  if (p) {
    tokens.push(p.matches.join(' '));
    if (p.category?.trim()) tokens.push(p.category.trim());
    if (p.seatDetails?.trim()) tokens.push(p.seatDetails.trim());
    tokens.push(String(p.quantity));
  }
  tokens.push(post.summary);
  return tokens;
}

function normalizeDedupeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Seller notes with lines that repeat structured grid data removed or softened. */
export function sellNotesExcludingStructured(
  post: TicketWallPost,
  schedule: Match | null,
): string {
  const raw = sellUserDescription(post);
  if (!raw.trim()) return '';
  const blob = normalizeDedupeText(sellStructuredDedupeTokens(post, schedule).join(' '));
  const paragraphs = raw.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const kept = paragraphs.filter(p => {
    const n = normalizeDedupeText(p);
    if (!n || n.length < 10) return true;
    if (blob.includes(n)) return false;
    const words = n.split(' ').filter(w => w.length > 2);
    if (!words.length) return true;
    const overlap = words.filter(w => blob.includes(w)).length;
    return overlap / words.length < 0.62;
  });
  return kept.join('\n').trim();
}

export function sellUserDescription(post: TicketWallPost): string {
  const p = sellPayload(post);
  if (!p) return post.summary;
  const parts: string[] = [];
  if (p.notes?.trim()) parts.push(p.notes.trim());
  if (p.delivery?.trim()) parts.push(p.delivery.trim());
  return parts.length > 0 ? parts.join('\n') : post.summary;
}

export function sellWhatsappDigits(post: TicketWallPost): string | null {
  const p = sellPayload(post);
  if (!p?.whatsapp) return null;
  const d = whatsappDigits(p.whatsapp);
  return d.length >= 8 ? d : null;
}

export interface WhatsappPrefillContext {
  kind: TicketWallKind;
  matchLabel: string;
  quantity: number;
}

/** Match + qty only — no brand, price, or “negotiable” in the WA opener. */
export function whatsappPrefillContext(post: TicketWallPost): WhatsappPrefillContext {
  if (post.kind === 'sell') {
    const p = sellPayload(post);
    const m = primaryScheduleMatchForSellPost(post);
    const matchLabel = m
      ? `${m.homeTeam} vs ${m.awayTeam}`
      : p?.matches?.[0]?.replace(/^Match\s+\d+\s*·\s*/i, '').trim() || 'this match';
    const quantity = p?.quantity != null && p.quantity >= 1 ? p.quantity : 1;
    return { kind: 'sell', matchLabel, quantity };
  }
  const p = post.payload as TicketBuyPayload | undefined;
  const matchLabel = p?.targetMatch?.trim() || post.summary.split('·')[0]?.trim() || 'this match';
  const quantity = p?.quantity != null && p.quantity >= 1 ? p.quantity : 1;
  return { kind: 'buy', matchLabel, quantity };
}

export function formatWhatsappDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length <= 3) return d;
  if (d.length <= 10 && !d.startsWith('1')) return d;
  if (d.length === 11 && d.startsWith('1')) {
    return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return `+${d}`;
}
