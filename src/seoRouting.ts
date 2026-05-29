import type { Lang } from './i18n';
import { buildTicketPostPath, parseTicketPostIdFromPath } from './ticketRouting';

export type ListingTab = 'tickets' | 'wanted' | 'cars' | 'hotels' | 'odds';

export const SEO_PATHS = ['/', '/tickets', '/wanted', '/cars', '/hotels', '/odds', '/guides'] as const;
export type SeoPath = (typeof SEO_PATHS)[number];

const PATH_TO_TAB: Record<string, ListingTab> = {
  '/': 'tickets',
  '/tickets': 'tickets',
  '/wanted': 'wanted',
  '/cars': 'cars',
  '/hotels': 'hotels',
  '/odds': 'odds',
};

const TAB_TO_PATH: Record<ListingTab, SeoPath> = {
  tickets: '/tickets',
  wanted: '/wanted',
  cars: '/cars',
  hotels: '/hotels',
  odds: '/odds',
};

export function normalizePathname(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/index.html' ? '/' : p;
}

export function tabFromPath(pathname: string): ListingTab {
  return PATH_TO_TAB[normalizePathname(pathname)] ?? 'tickets';
}

export function pathFromTab(tab: ListingTab): SeoPath {
  return TAB_TO_PATH[tab];
}

export function isGuidesPath(pathname: string): boolean {
  return normalizePathname(pathname) === '/guides';
}

export interface UrlAppState {
  tab: ListingTab;
  city: string | null;
  match: number | null;
  team: string | null;
  ticket: string | null;
  scrollToGuides: boolean;
}

export function readUrlAppState(url: URL = new URL(window.location.href)): UrlAppState {
  const path = normalizePathname(url.pathname);
  const legacyTab = url.searchParams.get('tab');
  let tab = tabFromPath(path);
  if (path === '/' && legacyTab && legacyTab in TAB_TO_PATH) {
    tab = legacyTab as ListingTab;
  }
  const city = url.searchParams.get('city')?.trim() || null;
  const matchRaw = url.searchParams.get('match')?.trim();
  const match =
    matchRaw && /^\d+$/.test(matchRaw) ? Number.parseInt(matchRaw, 10) : null;
  const ticketFromPath = parseTicketPostIdFromPath(path);
  const ticket = ticketFromPath || url.searchParams.get('ticket')?.trim() || null;
  const team = url.searchParams.get('team')?.trim() || null;
  return {
    tab: ticket || ticketFromPath ? 'tickets' : tab,
    city,
    match,
    team,
    ticket,
    scrollToGuides: path === '/guides',
  };
}

export function buildAppUrl(opts: {
  tab: ListingTab;
  city?: string | null;
  match?: number | null;
  team?: string | null;
  ticketId?: string | null;
  guides?: boolean;
  origin?: string;
}): string {
  const origin = opts.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://okcopa.com');
  if (opts.ticketId) {
    const url = new URL(origin);
    url.pathname = buildTicketPostPath(opts.ticketId);
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  const url = new URL(origin);
  url.pathname = opts.guides ? '/guides' : pathFromTab(opts.tab);
  url.search = '';
  url.hash = '';
  if (opts.city) url.searchParams.set('city', opts.city);
  if (opts.match != null) url.searchParams.set('match', String(opts.match));
  if (opts.team) url.searchParams.set('team', opts.team);
  return url.toString();
}

export interface PageSeoMeta {
  title: string;
  description: string;
}

const PAGE_META: Record<Lang, Record<SeoPath, PageSeoMeta>> = {
  en: {
    '/': {
      title: 'OKcopa · World Cup 2026 Tickets, Stays & Trip Planning',
      description:
        'Free fan-to-fan World Cup 2026 ticket wall, host-city stays, car hire, and ticket buying guides — contact sellers on WhatsApp.',
    },
    '/tickets': {
      title: 'World Cup 2026 Tickets for Sale · Fan-to-Fan · OKcopa',
      description:
        'Browse live fan ticket listings for FIFA World Cup 2026. Filter by host city, compare prices, and message sellers on WhatsApp with no buyer fees.',
    },
    '/wanted': {
      title: 'World Cup 2026 Ticket Requests · Fans Looking to Buy · OKcopa',
      description:
        'See who is looking for FIFA World Cup 2026 tickets by match and city. Post a buy request or message fans who need seats on WhatsApp.',
    },
    '/cars': {
      title: 'World Cup 2026 Car Hire Near Stadiums · OKcopa',
      description:
        'Compare car rental listings near World Cup 2026 host cities and stadiums — plan match-day transport in the USA, Mexico, and Canada.',
    },
    '/hotels': {
      title: 'World Cup 2026 Stays & Hotels Near Host Cities · OKcopa',
      description:
        'Find homestays and hotel-style listings near FIFA World Cup 2026 host cities — pair lodging with tickets on OKcopa.',
    },
    '/odds': {
      title: 'World Cup 2026 Odds Overview (Illustrative) · OKcopa',
      description:
        'Reference outright and group-stage odds for World Cup 2026 — informational only, not live betting on OKcopa.',
    },
    '/guides': {
      title: 'World Cup 2026 Ticket Buying Guide & Price Trends · OKcopa',
      description:
        'How to buy World Cup 2026 tickets fan-to-fan: strategy, price trends, safety checklist, and how to use the OKcopa ticket wall.',
    },
  },
  es: {
    '/': {
      title: 'OKcopa · Mundial 2026 — Boletos, hospedaje y viaje',
      description:
        'Muro fan a fan gratis, hospedaje, autos y guías de boletos del Mundial 2026 — contacta vendedores por WhatsApp.',
    },
    '/tickets': {
      title: 'Boletos Mundial 2026 en venta · Fan a fan · OKcopa',
      description:
        'Anuncios en vivo de boletos del Mundial 2026. Filtra por ciudad sede y escribe al vendedor por WhatsApp.',
    },
    '/wanted': {
      title: 'Pedidos de boletos Mundial 2026 · Aficionados que buscan · OKcopa',
      description:
        'Quién busca boletos del Mundial 2026 por partido y ciudad. Publica tu pedido o escribe por WhatsApp a quien necesita entradas.',
    },
    '/cars': {
      title: 'Renta de autos cerca de estadios · Mundial 2026 · OKcopa',
      description:
        'Compara autos de alquiler cerca de ciudades sede y estadios del Mundial 2026.',
    },
    '/hotels': {
      title: 'Hospedaje cerca de ciudades sede · Mundial 2026 · OKcopa',
      description:
        'Encuentra hospedaje cerca de las sedes del Mundial 2026 y combínalo con boletos en OKcopa.',
    },
    '/odds': {
      title: 'Cuotas de referencia · Mundial 2026 · OKcopa',
      description:
        'Cuotas ilustrativas del Mundial 2026 — solo información, sin apuestas en OKcopa.',
    },
    '/guides': {
      title: 'Guía para comprar boletos y tendencias de precio · OKcopa',
      description:
        'Estrategia fan a fan, tendencias de precio y seguridad al comprar boletos del Mundial 2026.',
    },
  },
  pt: {
    '/': {
      title: 'OKcopa · Copa 2026 — Ingressos, hospedagem e viagem',
      description:
        'Mural torcedor a torcedor grátis, hospedagem, carros e guias de ingressos da Copa 2026 — WhatsApp direto com vendedores.',
    },
    '/tickets': {
      title: 'Ingressos Copa 2026 à venda · Torcedor a torcedor · OKcopa',
      description:
        'Anúncios ao vivo de ingressos da Copa 2026. Filtre por cidade-sede e fale com o vendedor no WhatsApp.',
    },
    '/wanted': {
      title: 'Pedidos de ingressos Copa 2026 · Torcedores procurando · OKcopa',
      description:
        'Quem procura ingressos da Copa 2026 por jogo e cidade. Publique seu pedido ou fale no WhatsApp com quem precisa de ingressos.',
    },
    '/cars': {
      title: 'Aluguel de carros perto dos estádios · Copa 2026 · OKcopa',
      description:
        'Compare aluguel de carros perto das cidades-sede e estádios da Copa 2026.',
    },
    '/hotels': {
      title: 'Hospedagem perto das sedes · Copa 2026 · OKcopa',
      description:
        'Encontre hospedagem perto das sedes da Copa 2026 e combine com ingressos na OKcopa.',
    },
    '/odds': {
      title: 'Visão de odds · Copa 2026 · OKcopa',
      description:
        'Odds ilustrativas da Copa 2026 — apenas informação, sem apostas na OKcopa.',
    },
    '/guides': {
      title: 'Guia de compra de ingressos e tendências de preço · OKcopa',
      description:
        'Estratégia torcedor a torcedor, tendências de preço e segurança na compra de ingressos da Copa 2026.',
    },
  },
};

export function pageMetaForUrl(lang: Lang, url: URL): PageSeoMeta {
  const path = normalizePathname(url.pathname);
  if (path === '/guides') return PAGE_META[lang]['/guides'];
  const legacyTab = url.searchParams.get('tab');
  if (path === '/' && legacyTab && legacyTab in TAB_TO_PATH) {
    return PAGE_META[lang][pathFromTab(legacyTab as ListingTab)];
  }
  const key = (path in PAGE_META[lang] ? path : '/tickets') as SeoPath;
  return PAGE_META[lang][key];
}
