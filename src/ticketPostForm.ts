import type { Match } from './matchTypes';
import type { Lang, Translations } from './i18n';
import type { TicketWallPost } from './ticketPosts';
import { defaultPostMeta } from './ticketPosts';
import { primaryMatchFlagsForSellPost } from './sellMatchFlags';
import { resolveTicketPostFlag } from './teamFlags';

export interface TicketSellPayload {
  matches: string[];
  quantity: number;
  category?: string;
  seatDetails?: string;
  name?: string;
  priceType: 'fixed' | 'negotiable';
  priceAmount?: number;
  whatsapp: string;
  delivery?: string;
  notes?: string;
}

export interface TicketBuyPayload {
  targetMatch: string;
  quantity: number;
  category?: string;
  seatDetails?: string;
  budget?: string;
  whatsapp: string;
}

export function formatMatchOption(m: Match): string {
  return `Match ${m.matchNumber} · ${m.homeTeam} vs ${m.awayTeam}`;
}

export function whatsappDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidWhatsapp(phone: string): boolean {
  return whatsappDigits(phone).length >= 8;
}

export function buildSellSummary(p: TicketSellPayload): string {
  const parts: string[] = [];
  parts.push(p.matches.join(' / '));
  parts.push(`${p.quantity} ticket${p.quantity !== 1 ? 's' : ''}`);
  if (p.category) parts.push(p.category);
  if (p.seatDetails?.trim()) parts.push(p.seatDetails.trim());
  if (p.priceType === 'negotiable') parts.push('Negotiable');
  else if (p.priceAmount != null) parts.push(`$${p.priceAmount} USD`);
  return parts.join(' · ');
}

export function buildBuySummary(p: TicketBuyPayload): string {
  const parts: string[] = [p.targetMatch.trim(), `${p.quantity} ticket${p.quantity !== 1 ? 's' : ''}`];
  if (p.category) parts.push(p.category);
  if (p.seatDetails?.trim()) parts.push(p.seatDetails.trim());
  if (p.budget?.trim()) parts.push(p.budget.trim());
  return parts.join(' · ');
}

export function buildSellDetailLines(p: TicketSellPayload, tr: Translations): string[] {
  const lines: string[] = [
    `${tr.formLabelMatch}: ${p.matches.join('; ')}`,
    `${tr.formLabelQuantity}: ${p.quantity}`,
  ];
  if (p.category) lines.push(`${tr.formLabelCategory}: ${p.category}`);
  if (p.seatDetails?.trim()) lines.push(`${tr.formLabelSeatDetails}: ${p.seatDetails.trim()}`);
  if (p.name?.trim()) lines.push(`${tr.formLabelName}: ${p.name.trim()}`);
  if (p.priceType === 'negotiable') lines.push(`${tr.formLabelPrice}: ${tr.formPriceNegotiable}`);
  else if (p.priceAmount != null) lines.push(`${tr.formLabelPrice}: $${p.priceAmount} USD`);
  if (p.delivery?.trim()) {
    lines.push(`${tr.formLabelDelivery}: ${p.delivery.trim()}`);
  }
  if (p.notes?.trim()) lines.push(`${tr.formLabelNotes}: ${p.notes.trim()}`);
  lines.push(`${tr.formLabelWhatsapp}: ${p.whatsapp}`);
  return lines;
}

export function buildBuyDetailLines(p: TicketBuyPayload, tr: Translations): string[] {
  const lines: string[] = [
    `${tr.formLabelTargetMatch}: ${p.targetMatch.trim()}`,
    `${tr.formLabelQuantity}: ${p.quantity}`,
  ];
  if (p.category) lines.push(`${tr.formLabelCategory}: ${p.category}`);
  if (p.seatDetails?.trim()) lines.push(`${tr.formLabelSeatDetails}: ${p.seatDetails.trim()}`);
  if (p.budget?.trim()) lines.push(`${tr.formLabelBudget}: ${p.budget.trim()}`);
  lines.push(`${tr.formLabelWhatsapp}: ${p.whatsapp}`);
  return lines;
}

export function createWallPostFromSell(
  payload: TicketSellPayload,
  lang: Lang,
  tr: Translations,
): TicketWallPost {
  const defaults = defaultPostMeta(lang);
  const summary = buildSellSummary(payload);
  const draft: TicketWallPost = {
    id: `user-${Date.now()}`,
    kind: 'sell',
    flag: defaults.flag,
    username: payload.name?.trim() || defaults.username,
    summary,
    detail: buildSellDetailLines(payload, tr).join('\n'),
    createdAt: Date.now(),
    isUser: true,
    payload,
  };
  return {
    ...draft,
    flag: resolveTicketPostFlag(draft, primaryMatchFlagsForSellPost(draft)),
  };
}

export function createWallPostFromBuy(
  payload: TicketBuyPayload,
  lang: Lang,
  tr: Translations,
): TicketWallPost {
  const defaults = defaultPostMeta(lang);
  const summary = buildBuySummary(payload);
  return {
    id: `user-${Date.now()}`,
    kind: 'buy',
    flag: defaults.flag,
    username: defaults.username,
    summary,
    detail: buildBuyDetailLines(payload, tr).join('\n'),
    createdAt: Date.now(),
    isUser: true,
    payload,
  };
}

export type TicketWallPayload = TicketSellPayload | TicketBuyPayload;

/** Category + seat line for wall cards (e.g. "Cat 2 · Sec 102 Row 12"). */
export function formatCategorySeatLine(p: { category?: string; seatDetails?: string }): string | null {
  const cat = p.category?.trim();
  const seat = p.seatDetails?.trim();
  if (cat && seat) return `${cat} · ${seat}`;
  if (cat) return cat;
  if (seat) return seat;
  return null;
}

export function getPostWhatsapp(post: TicketWallPost): string | null {
  if (!post.payload || !('whatsapp' in post.payload)) return null;
  const raw = String(post.payload.whatsapp).trim();
  const digits = whatsappDigits(raw);
  return digits.length >= 8 ? digits : null;
}

/** Phone → wa.me with prefill; full https / wa.me/message/ links used as-is. */
export function getWhatsappHref(post: TicketWallPost, prefill: string): string | null {
  if (!post.payload || !('whatsapp' in post.payload)) return null;
  const raw = String(post.payload.whatsapp).trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw) || /wa\.me\//i.test(raw)) {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (/wa\.me\/message\//i.test(url)) return url;
    const digits = whatsappDigits(url);
    if (digits.length >= 8) {
      return `https://wa.me/${digits}?text=${encodeURIComponent(prefill)}`;
    }
    return url;
  }

  const digits = whatsappDigits(raw);
  if (digits.length >= 8) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(prefill)}`;
  }
  return null;
}
