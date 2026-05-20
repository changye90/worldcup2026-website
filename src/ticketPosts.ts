import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
const SUPABASE_TABLE = 'ticket_wall_posts';
const SUPABASE_FETCH_LIMIT = 200;

let supabaseClient: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    supabaseClient = null;
    return supabaseClient;
  }
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

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

interface TicketWallDbRow {
  id: string;
  kind: TicketWallKind;
  flag: string;
  username: string;
  summary: string;
  detail: string;
  created_at_ms?: number | null;
  created_at?: string | null;
  payload?: TicketSellPayload | TicketBuyPayload | null;
}

function dbRowToPost(row: TicketWallDbRow, localIds: Set<string>): TicketWallPost {
  const fromMs = typeof row.created_at_ms === 'number' ? row.created_at_ms : null;
  const fromIso = row.created_at ? Date.parse(row.created_at) : NaN;
  return {
    id: row.id,
    kind: row.kind,
    flag: row.flag || '🏳️',
    username: row.username || 'Fan',
    summary: row.summary || '',
    detail: row.detail || '',
    createdAt: fromMs ?? (Number.isFinite(fromIso) ? fromIso : Date.now()),
    isUser: localIds.has(row.id),
    payload: row.payload ?? undefined,
  };
}

export async function loadSharedTicketPosts(localIds: Set<string>): Promise<TicketWallPost[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('id, kind, flag, username, summary, detail, created_at_ms, created_at, payload')
      .order('created_at_ms', { ascending: false })
      .limit(SUPABASE_FETCH_LIMIT);
    if (error || !Array.isArray(data)) return null;
    return data
      .filter(row => row.kind === 'buy' || row.kind === 'sell')
      .map(row => dbRowToPost(row as TicketWallDbRow, localIds));
  } catch {
    return null;
  }
}

export async function persistSharedTicketPost(post: TicketWallPost): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(SUPABASE_TABLE).upsert({
      id: post.id,
      kind: post.kind,
      flag: post.flag,
      username: post.username,
      summary: post.summary,
      detail: post.detail,
      created_at_ms: post.createdAt,
      payload: post.payload ?? null,
    });
    return !error;
  } catch {
    return false;
  }
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
