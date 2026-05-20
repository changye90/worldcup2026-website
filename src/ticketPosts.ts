import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';

export type TicketWallKind = 'buy' | 'sell';

export interface TicketWallPost {
  id: string;
  kind: TicketWallKind;
  flag: string;
  username: string;
  /** Compact segment after the verb phrase on the wall */
  summary: string;
  detail: string;
  createdAt: number;
  isUser?: boolean;
  payload?: TicketSellPayload | TicketBuyPayload;
}

/** Bump when clearing the wall so browsers drop old localStorage posts. */
const STORAGE_KEY = 'okcopa-ticket-wall-v2';

/** Demo/seed posts — empty until real listings are imported. */
export const seedTicketWallPosts: TicketWallPost[] = [];

export function loadUserTicketPosts(): TicketWallPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TicketWallPost[];
    return Array.isArray(parsed) ? parsed.filter(p => p.kind === 'buy' || p.kind === 'sell') : [];
  } catch {
    return [];
  }
}

export function persistUserTicketPost(post: TicketWallPost): void {
  const existing = loadUserTicketPosts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([post, ...existing].slice(0, 40)));
}

export function clearUserTicketPosts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('okcopa-ticket-wall-v1');
  } catch {
    /* ignore */
  }
}

/** Pull optional leading flag + first token as display name. */
export function parsePostMeta(
  text: string,
  defaults: { flag: string; username: string },
): { flag: string; username: string; summary: string } {
  let rest = text.trim();
  let flag = defaults.flag;
  let username = defaults.username;

  const flagAtStart = rest.match(/^([\u{1F1E6}-\u{1F1FF}]{2})\s*/u);
  if (flagAtStart) {
    flag = flagAtStart[1];
    rest = rest.slice(flagAtStart[0].length);
  }

  const nameMatch = rest.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.-]{1,24})\s+(.+)$/s);
  if (nameMatch) {
    username = nameMatch[1];
    rest = nameMatch[2].trim();
  }

  const summary = rest.replace(/\s+/g, ' ').slice(0, 140);
  return { flag, username, summary: summary || text.trim().slice(0, 140) };
}

export function defaultPostMeta(lang: 'en' | 'es' | 'pt'): { flag: string; username: string } {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  if (lang === 'es') return { flag: '🇲🇽', username: `Fan${suffix}` };
  if (lang === 'pt') return { flag: '🇧🇷', username: `Torcedor${suffix}` };
  return { flag: '🇺🇸', username: `Fan${suffix}` };
}
