import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import { normalizeBudgetValue } from './ticketPostForm';
import { primaryMatchFlagsForSellPost } from './sellMatchFlags';
import { resolveTicketPostFlag } from './teamFlags';
import { filterVisibleTicketWallPosts, ticketWallPostIsJunk } from './ticketWallFilters';
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
/** Last successful Supabase wall snapshot — instant first paint on repeat visits. */
const SHARED_CACHE_KEY = 'okcopa-ticket-wall-shared-v1';
const SUPABASE_TABLE = 'ticket_wall_posts';

/**
 * Newest-first cap for Supabase `.limit()` and in-memory wall merge.
 * (Was 200 — too low once bulk import exceeded that; PostgREST default max is usually 1000.)
 */
export const TICKET_WALL_MAX_POSTS = 1000;

let sharedPrefetch: Promise<TicketWallPost[] | null> | null = null;

let supabaseClient: SupabaseClient | null | undefined;

export function getTicketWallSupabase(): SupabaseClient | null {
  return getSupabaseClient();
}

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

/** Default wall order: newest first (by `createdAt` ms). */
export function sortTicketPostsNewestFirst(posts: TicketWallPost[]): TicketWallPost[] {
  return [...posts].sort((a, b) => {
    const dt = b.createdAt - a.createdAt;
    if (dt !== 0) return dt;
    return b.id.localeCompare(a.id);
  });
}

export function isTicketWallRemoteEnabled(): boolean {
  return getSupabaseClient() != null;
}

export function loadCachedSharedTicketPosts(): TicketWallPost[] {
  try {
    const raw = localStorage.getItem(SHARED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { posts?: TicketWallPost[] };
    const list = Array.isArray(parsed?.posts)
      ? parsed.posts.filter(p => p.kind === 'buy' || p.kind === 'sell')
      : [];
    return filterVisibleTicketWallPosts(sortTicketPostsNewestFirst(list));
  } catch {
    return [];
  }
}

export function persistCachedSharedTicketPosts(posts: TicketWallPost[]): void {
  try {
    localStorage.setItem(
      SHARED_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        posts: filterVisibleTicketWallPosts(sortTicketPostsNewestFirst(posts)).slice(
          0,
          TICKET_WALL_MAX_POSTS,
        ),
      }),
    );
  } catch {
    /* quota */
  }
}

/** Merge local user posts with shared/cached rows (local wins `isUser`). */
export function mergeTicketWallPosts(
  localPosts: TicketWallPost[],
  sharedPosts: TicketWallPost[],
): TicketWallPost[] {
  const localIds = new Set(localPosts.map(p => p.id));
  const merged = new Map<string, TicketWallPost>();
  for (const p of [...localPosts, ...sharedPosts]) {
    merged.set(p.id, localIds.has(p.id) ? { ...p, isUser: true } : p);
  }
  return filterVisibleTicketWallPosts(sortTicketPostsNewestFirst(Array.from(merged.values()))).slice(
    0,
    TICKET_WALL_MAX_POSTS,
  );
}

export function loadUserTicketPosts(): TicketWallPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TicketWallPost[];
    const list = Array.isArray(parsed) ? parsed.filter(p => p.kind === 'buy' || p.kind === 'sell') : [];
    return sortTicketPostsNewestFirst(list);
  } catch {
    return [];
  }
}

export function persistUserTicketPost(post: TicketWallPost): void {
  const existing = loadUserTicketPosts().filter(p => p.id !== post.id);
  const next = sortTicketPostsNewestFirst([{ ...post, isUser: true }, ...existing]).slice(0, 40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

function resolveCreatedAtMs(row: TicketWallDbRow): number {
  const fromMs = typeof row.created_at_ms === 'number' && row.created_at_ms > 0 ? row.created_at_ms : null;
  const fromIso = row.created_at ? Date.parse(row.created_at) : NaN;
  if (fromMs != null && Number.isFinite(fromIso)) return Math.max(fromMs, fromIso);
  if (fromMs != null) return fromMs;
  if (Number.isFinite(fromIso)) return fromIso;
  return 0;
}

function dbRowToPost(row: TicketWallDbRow, localIds: Set<string>): TicketWallPost {
  let payload = row.payload ?? undefined;
  if (row.kind === 'buy' && payload && typeof payload === 'object' && 'targetMatch' in payload) {
    const p = payload as TicketBuyPayload;
    const budget = normalizeBudgetValue(p.budget);
    if (budget !== p.budget) {
      payload = { ...p, budget };
    }
  }
  const base = {
    id: row.id,
    kind: row.kind,
    flag: row.flag || '🏳️',
    username: row.username || 'Fan',
    summary: (row.summary || '').replace(/面议/g, 'Negotiable').replace(/议价/g, 'Negotiable'),
    detail: (row.detail || '').replace(/面议/g, 'Negotiable').replace(/议价/g, 'Negotiable'),
    createdAt: resolveCreatedAtMs(row),
    isUser: localIds.has(row.id),
    payload,
  };
  return {
    ...base,
    flag: resolveTicketPostFlag(
      base,
      base.kind === 'sell' ? primaryMatchFlagsForSellPost(base) : null,
    ),
  };
}

export async function fetchTicketPostById(id: string): Promise<TicketWallPost | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('id, kind, flag, username, summary, detail, created_at_ms, created_at, payload')
      .eq('id', id)
      .maybeSingle();
    if (error || !data || (data.kind !== 'buy' && data.kind !== 'sell')) return null;
    const post = dbRowToPost(data as TicketWallDbRow, new Set());
    if (ticketWallPostIsJunk(post)) return null;
    return post;
  } catch {
    return null;
  }
}

export async function loadSharedTicketPosts(localIds: Set<string>): Promise<TicketWallPost[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('id, kind, flag, username, summary, detail, created_at_ms, created_at, payload')
      .order('created_at_ms', { ascending: false })
      .limit(TICKET_WALL_MAX_POSTS);
    if (error || !Array.isArray(data)) return null;
    return filterVisibleTicketWallPosts(
      data
        .filter(row => row.kind === 'buy' || row.kind === 'sell')
        .map(row => dbRowToPost(row as TicketWallDbRow, localIds)),
    );
  } catch {
    return null;
  }
}

/** Start Supabase fetch as early as possible (module import / main.tsx). */
export function prefetchSharedTicketPosts(): Promise<TicketWallPost[] | null> {
  if (!sharedPrefetch) {
    sharedPrefetch = loadSharedTicketPosts(new Set());
  }
  return sharedPrefetch;
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
    localStorage.removeItem(SHARED_CACHE_KEY);
    localStorage.removeItem('okcopa-ticket-wall-v1');
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined' && isTicketWallRemoteEnabled()) {
  prefetchSharedTicketPosts();
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
