import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'site_analytics_events';
const VISITOR_KEY = 'okcopa_vid';
const SESSION_KEY = 'okcopa_sid';
const SESSION_TS_KEY = 'okcopa_sid_ts';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    client = null;
    return client;
  }
  client = createClient(url, anonKey);
  return client;
}

function newId(): string {
  return crypto.randomUUID();
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

function getSessionId(): string {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(SESSION_TS_KEY) || 0);
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid || now - last > SESSION_TIMEOUT_MS) {
      sid = newId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return sid;
  } catch {
    return 'session';
  }
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}

/** Fire-and-forget event; no-op when Supabase is not configured. */
export function track(event: string, props?: Record<string, unknown>): void {
  const supabase = getClient();
  if (!supabase) return;

  const row = {
    event,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    path: currentPath(),
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    props: props ?? null,
    created_at_ms: Date.now(),
  };

  void supabase.from(TABLE).insert(row).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn('[okcopa analytics]', event, error.message);
    }
  });
}

/** Page view (PV). UV = distinct `visitor_id` in SQL. */
export function trackPageView(props?: { tab?: string; source?: string }): void {
  track('page_view', {
    tab: props?.tab,
    source: props?.source ?? 'load',
    href: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

export const AnalyticsEvent = {
  PageView: 'page_view',
  TicketWhatsapp: 'ticket_whatsapp_click',
  CarCall: 'car_call_click',
  HotelCall: 'hotel_call_click',
  HeaderSchedule: 'header_schedule_click',
  HeaderLangOpen: 'header_lang_open',
  HeaderLangSelect: 'header_lang_select',
  HeroSell: 'hero_sell_click',
  HeroBuy: 'hero_buy_click',
  HeroTab: 'hero_tab_click',
  ListingsTab: 'listings_tab_click',
  ScheduleDate: 'schedule_date_click',
  ScheduleMatch: 'schedule_match_click',
} as const;
