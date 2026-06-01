import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'site_analytics_events';
const VISITOR_KEY = 'okcopa_vid';
const SESSION_KEY = 'okcopa_sid';
const SESSION_TS_KEY = 'okcopa_sid_ts';
const SESSION_NEW_KEY = 'okcopa_sid_new';
const ATTR_FT_KEY = 'okcopa_attr_ft';
const ATTR_LT_KEY = 'okcopa_attr_lt';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

let client: SupabaseClient | null | undefined;
let attributionBooted = false;

export interface StoredAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  /** Classified channel: direct | internal | google | facebook | whatsapp | instagram | twitter | referral | unknown */
  ref_channel: string;
  ref_host?: string;
  landing_path: string;
  landing_href: string;
  captured_at_ms: number;
}

let runtimeLang: string | undefined;

/** Call once from App when language is known — merged into every event. */
export function setAnalyticsLang(lang: string): void {
  runtimeLang = lang;
}

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
    const isNew = !sid || now - last > SESSION_TIMEOUT_MS;
    if (isNew) {
      sid = newId();
      sessionStorage.setItem(SESSION_KEY, sid);
      sessionStorage.setItem(SESSION_NEW_KEY, '1');
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return sid;
  } catch {
    return 'session';
  }
}

function consumeNewSessionFlag(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_NEW_KEY) === '1') {
      sessionStorage.removeItem(SESSION_NEW_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}

function classifyReferrer(referrer: string): { ref_channel: string; ref_host?: string } {
  if (!referrer?.trim()) return { ref_channel: 'direct' };
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('okcopa')) return { ref_channel: 'internal', ref_host: host };
    if (host.includes('google')) return { ref_channel: 'google', ref_host: host };
    if (host.includes('facebook') || host.includes('fb.com') || host === 'fb.me') {
      return { ref_channel: 'facebook', ref_host: host };
    }
    if (host.includes('whatsapp') || host.includes('wa.me')) {
      return { ref_channel: 'whatsapp', ref_host: host };
    }
    if (host.includes('instagram')) return { ref_channel: 'instagram', ref_host: host };
    if (host.includes('twitter') || host.includes('t.co') || host === 'x.com') {
      return { ref_channel: 'twitter', ref_host: host };
    }
    if (host.includes('bing.')) return { ref_channel: 'bing', ref_host: host };
    return { ref_channel: 'referral', ref_host: host };
  } catch {
    return { ref_channel: 'unknown' };
  }
}

function readStoredAttribution(key: string): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

function utmFromUrl(url: URL): Partial<StoredAttribution> {
  const pick = (name: string) => url.searchParams.get(name)?.trim() || undefined;
  const utm_source = pick('utm_source');
  const utm_medium = pick('utm_medium');
  const hasUtm = utm_source || utm_medium || pick('utm_campaign') || pick('utm_content') || pick('utm_term');
  if (!hasUtm && !pick('gclid') && !pick('fbclid')) return {};
  return {
    utm_source,
    utm_medium,
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    utm_term: pick('utm_term'),
    gclid: pick('gclid'),
    fbclid: pick('fbclid'),
  };
}

/** Persist first-touch + last-touch attribution from landing URL (safe to call multiple times). */
export function captureAttributionFromUrl(url: URL = new URL(window.location.href)): void {
  if (typeof window === 'undefined') return;

  const ref = document.referrer || '';
  const { ref_channel, ref_host } = classifyReferrer(ref);
  const utm = utmFromUrl(url);
  const hasMarketing =
    Object.keys(utm).length > 0 || ref_channel !== 'direct';

  const snapshot: StoredAttribution = {
    ...utm,
    ref_channel,
    ref_host,
    landing_path: `${url.pathname}${url.search}`,
    landing_href: url.href,
    captured_at_ms: Date.now(),
  };

  if (!readStoredAttribution(ATTR_FT_KEY) && hasMarketing) {
    try {
      localStorage.setItem(ATTR_FT_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota */
    }
  }

  if (hasMarketing || !readStoredAttribution(ATTR_LT_KEY)) {
    try {
      localStorage.setItem(ATTR_LT_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota */
    }
  }
}

function bootAttribution(): void {
  if (attributionBooted || typeof window === 'undefined') return;
  attributionBooted = true;
  captureAttributionFromUrl();
}

function attributionProps(): Record<string, unknown> {
  const ft = readStoredAttribution(ATTR_FT_KEY);
  const lt = readStoredAttribution(ATTR_LT_KEY) ?? ft;
  const out: Record<string, unknown> = {};
  const copy = (prefix: string, a: StoredAttribution | null) => {
    if (!a) return;
    if (a.utm_source) out[`${prefix}utm_source`] = a.utm_source;
    if (a.utm_medium) out[`${prefix}utm_medium`] = a.utm_medium;
    if (a.utm_campaign) out[`${prefix}utm_campaign`] = a.utm_campaign;
    if (a.utm_content) out[`${prefix}utm_content`] = a.utm_content;
    if (a.utm_term) out[`${prefix}utm_term`] = a.utm_term;
    if (a.gclid) out[`${prefix}gclid`] = a.gclid;
    if (a.fbclid) out[`${prefix}fbclid`] = a.fbclid;
    out[`${prefix}ref_channel`] = a.ref_channel;
    if (a.ref_host) out[`${prefix}ref_host`] = a.ref_host;
    if (a.landing_path) out[`${prefix}landing_path`] = a.landing_path;
  };
  copy('ft_', ft);
  copy('', lt);
  return out;
}

function urlFilterProps(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  const url = new URL(window.location.href);
  const out: Record<string, unknown> = {};
  const city = url.searchParams.get('city');
  const match = url.searchParams.get('match');
  const team = url.searchParams.get('team');
  const ticketFromQuery = url.searchParams.get('ticket');
  const path = url.pathname.replace(/\/$/, '') || '/';
  const ticketFromPath = path.match(/^\/tickets\/([^/]+)$/)?.[1];
  let ticketId = ticketFromQuery?.trim() || null;
  if (ticketFromPath) {
    try {
      ticketId = decodeURIComponent(ticketFromPath).trim() || ticketId;
    } catch {
      ticketId = ticketFromPath.trim() || ticketId;
    }
  }
  if (city) out.filter_city = city;
  if (match) out.filter_match = Number.parseInt(match, 10);
  if (team) out.filter_team = team;
  if (ticketId) out.ticket_id = ticketId;
  if (url.searchParams.get('ref') === 'share') out.share_ref = true;
  if (path === '/guides') out.guides = true;
  if (path === '/wanted') out.tab_path = 'wanted';
  return out;
}

function mergeProps(props?: Record<string, unknown>): Record<string, unknown> | null {
  bootAttribution();
  const merged = {
    ...attributionProps(),
    ...urlFilterProps(),
    ...(runtimeLang ? { lang: runtimeLang } : {}),
    ...(props ?? {}),
  };
  return Object.keys(merged).length > 0 ? merged : null;
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
    props: mergeProps(props),
    created_at_ms: Date.now(),
  };

  void supabase.from(TABLE).insert(row).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn('[okcopa analytics]', event, error.message);
    }
  });
}

/** Page view (PV). UV = distinct `visitor_id` in SQL. */
export function trackPageView(props?: {
  tab?: string;
  source?: string;
  lang?: string;
}): void {
  if (props?.lang) runtimeLang = props.lang;
  track('page_view', {
    tab: props?.tab,
    source: props?.source ?? 'load',
    href: typeof window !== 'undefined' ? window.location.href : undefined,
    is_new_session: consumeNewSessionFlag(),
  });
}

/** @see docs/analytics-dictionary.md — keep string values stable for historical data */
export const AnalyticsEvent = {
  PageView: 'page_view',
  TicketWhatsapp: 'ticket_whatsapp_click',
  TicketShare: 'ticket_share_click',
  TicketDeepLink: 'ticket_deep_link_view',
  TicketDetailView: 'ticket_detail_view',
  TicketDetailShareOpen: 'ticket_detail_share_open',
  TicketDetailShareCopy: 'ticket_detail_share_copy',
  TicketPostSubmit: 'ticket_post_submit',
  VerifiedSellerRegister: 'verified_seller_register',
  VerifiedSellerPost: 'verified_seller_post',
  CarCall: 'car_call_click',
  HotelCall: 'hotel_call_click',
  HeaderSchedule: 'header_schedule_click',
  HeaderLangOpen: 'header_lang_open',
  HeaderLangSelect: 'header_lang_select',
  HeroSell: 'hero_sell_click',
  HeroBuy: 'hero_buy_click',
  /** @deprecated Hero tab row removed; kept for legacy rows */
  HeroTab: 'hero_tab_click',
  ListingsTab: 'listings_tab_click',
  ListingExpand: 'listing_expand_click',
  ScheduleDate: 'schedule_date_click',
  ScheduleMatch: 'schedule_match_click',
  FilterScheduleOpen: 'filter_schedule_open',
  FilterCitiesOpen: 'filter_cities_open',
  FilterNationOpen: 'filter_nation_open',
  FilterCity: 'filter_city_click',
  FilterNation: 'filter_nation_click',
  FilterClear: 'filter_clear_click',
} as const;
